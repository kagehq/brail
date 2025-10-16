import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ValidationResult,
} from './types.js';
import { parseDropJson, toNetlifyConfig } from './mappers/dropjson-to-platform.js';

interface NetlifyConfig {
  token: string; // Netlify Personal Access Token
  siteId?: string; // Existing site ID (optional, will create if not provided)
  siteName?: string; // Site name for new sites
}

/**
 * Netlify adapter for deploying to Netlify platform
 * Supports atomic deployments with preview URLs
 */
export class NetlifyAdapter implements DeployAdapter {
  name = 'netlify';

  private readonly API_BASE = 'https://api.netlify.com/api/v1';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as Partial<NetlifyConfig>;

    if (!c.token || typeof c.token !== 'string') {
      return { valid: false, reason: 'token is required (Netlify Personal Access Token)' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{
    destinationRef?: string;
    platformDeploymentId?: string;
    previewUrl?: string;
  }> {
    const config = input.config as NetlifyConfig;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Netlify] Starting deployment...');

    // Ensure site exists
    let siteId = config.siteId;
    if (!siteId) {
      const siteName = config.siteName || site.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      siteId = await this.ensureSite(ctx, config, siteName);
      ctx.logger.info(`[Netlify] Using site: ${siteId}`);
    }

    // Parse _drop.json and generate Netlify config files
    const dropConfig = await parseDropJson(filesDir);
    const netlifyConfig = toNetlifyConfig(dropConfig);

    // Collect files
    const files = await this.collectFiles(filesDir);
    ctx.logger.info(`[Netlify] Collected ${files.length} files`);

    // Compute file hashes
    const fileHashes: Record<string, string> = {};
    const fileContents = new Map<string, Buffer>();

    for (const file of files) {
      const content = await readFile(file.fullPath);
      const hash = createHash('sha1').update(content).digest('hex');
      fileHashes[file.relativePath] = hash;
      fileContents.set(file.relativePath, content);
    }

    // Add generated config files
    if (netlifyConfig._redirects) {
      const redirectsContent = Buffer.from(netlifyConfig._redirects);
      const hash = createHash('sha1').update(redirectsContent).digest('hex');
      fileHashes['_redirects'] = hash;
      fileContents.set('_redirects', redirectsContent);
    }

    if (netlifyConfig._headers) {
      const headersContent = Buffer.from(netlifyConfig._headers);
      const hash = createHash('sha1').update(headersContent).digest('hex');
      fileHashes['_headers'] = hash;
      fileContents.set('_headers', headersContent);
    }

    // Create deploy
    const deployResponse = await this.netlifyRequest(
      ctx,
      config,
      'POST',
      `/sites/${siteId}/deploys`,
      {
        files: fileHashes,
        draft: false,
        branch: 'main',
      },
    );

    const netDeployId = deployResponse.id;
    ctx.logger.info(`[Netlify] Created deploy: ${netDeployId}`);

    // Upload required files
    const required = deployResponse.required || [];
    if (required.length > 0) {
      ctx.logger.info(`[Netlify] Uploading ${required.length} files...`);

      for (const filePath of required) {
        const content = fileContents.get(filePath);
        if (!content) {
          ctx.logger.warn(`[Netlify] Missing content for ${filePath}`);
          continue;
        }

        await this.netlifyRequest(
          ctx,
          config,
          'PUT',
          `/deploys/${netDeployId}/files/${encodeURIComponent(filePath)}`,
          content,
          { 'Content-Type': 'application/octet-stream' },
        );

        ctx.logger.debug(`[Netlify] Uploaded ${filePath}`);
      }
    }

    ctx.logger.info('[Netlify] Upload complete');

    // Wait for deploy to be ready
    let deployStatus = deployResponse;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (deployStatus.state !== 'ready' && attempts < maxAttempts) {
      await this.sleep(5000); // Wait 5 seconds
      deployStatus = await this.netlifyRequest(
        ctx,
        config,
        'GET',
        `/deploys/${netDeployId}`,
      );
      attempts++;
      ctx.logger.debug(`[Netlify] Deploy state: ${deployStatus.state}`);
    }

    if (deployStatus.state !== 'ready') {
      throw new Error(`Deploy did not become ready after ${maxAttempts * 5} seconds`);
    }

    ctx.logger.info('[Netlify] Deploy is ready');

    const previewUrl = deployStatus.deploy_ssl_url || deployStatus.deploy_url;

    return {
      destinationRef: siteId,
      platformDeploymentId: netDeployId,
      previewUrl,
    };
  }

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    const config = input.config as NetlifyConfig;
    const { platformDeploymentId } = input;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Netlify activation');
    }

    ctx.logger.info('[Netlify] Publishing deploy...');

    // Restore deploy (unpublish and republish to make it live)
    await this.netlifyRequest(
      ctx,
      config,
      'POST',
      `/deploys/${platformDeploymentId}/restore`,
    );

    ctx.logger.info('[Netlify] Deploy published successfully');
  }

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    const config = input.config as NetlifyConfig;
    const { platformDeploymentId } = input;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Netlify rollback');
    }

    ctx.logger.info(`[Netlify] Rolling back to deploy ${platformDeploymentId}...`);

    // Restore the previous deploy
    await this.netlifyRequest(
      ctx,
      config,
      'POST',
      `/deploys/${platformDeploymentId}/restore`,
    );

    ctx.logger.info('[Netlify] Rollback complete');
  }

  /**
   * Ensure site exists, create if needed
   */
  private async ensureSite(
    ctx: AdapterContext,
    config: NetlifyConfig,
    siteName: string,
  ): Promise<string> {
    // Try to find existing site by name
    try {
      const sites = await this.netlifyRequest(ctx, config, 'GET', '/sites');
      const existing = sites.find((s: any) => s.name === siteName);

      if (existing) {
        ctx.logger.info(`[Netlify] Found existing site: ${existing.id}`);
        return existing.id;
      }
    } catch (error: any) {
      ctx.logger.warn(`[Netlify] Could not list sites: ${error.message}`);
    }

    // Create new site
    ctx.logger.info(`[Netlify] Creating new site: ${siteName}`);

    const site = await this.netlifyRequest(ctx, config, 'POST', '/sites', {
      name: siteName,
    });

    ctx.logger.info(`[Netlify] Created site: ${site.id}`);

    return site.id;
  }

  /**
   * Collect all files recursively
   */
  private async collectFiles(
    dir: string,
  ): Promise<Array<{ relativePath: string; fullPath: string }>> {
    const files: Array<{ relativePath: string; fullPath: string }> = [];

    const scan = async (currentDir: string) => {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          await scan(fullPath);
        } else if (entry.isFile()) {
          // Skip hidden files
          if (entry.name.startsWith('.')) continue;

          const relativePath = relative(dir, fullPath).replace(/\\/g, '/');
          files.push({ relativePath, fullPath });
        }
      }
    };

    await scan(dir);
    return files;
  }

  /**
   * Make Netlify API request
   */
  private async netlifyRequest(
    ctx: AdapterContext,
    config: NetlifyConfig,
    method: string,
    path: string,
    body?: any,
    extraHeaders?: Record<string, string>,
  ): Promise<any> {
    const url = `${this.API_BASE}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      ...extraHeaders,
    };

    let requestBody: any = body;

    if (body && !(body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Netlify API error (${response.status}): ${error}`);
    }

    if (response.status === 204) {
      return {}; // No content
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

