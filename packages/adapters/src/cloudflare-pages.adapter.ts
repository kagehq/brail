import { readFile, readdir, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import FormData from 'form-data';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ReleaseInfo,
  ValidationResult,
} from './types.js';
import { toCloudflareFiles, parseDropJson } from './mappers/dropjson-to-platform.js';

/**
 * Cloudflare Pages adapter for deploying to Cloudflare Pages
 * Supports preview and production deployments
 */
export class CloudflarePagesAdapter implements DeployAdapter {
  name = 'cloudflare-pages';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.accountId || typeof c.accountId !== 'string') {
      return { valid: false, reason: 'accountId is required' };
    }

    if (!c.apiToken || typeof c.apiToken !== 'string') {
      return { valid: false, reason: 'apiToken is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Cloudflare Pages] Starting deployment...');

    // Parse _drop.json and generate _headers/_redirects if needed
    const dropConfig = await parseDropJson(filesDir);
    const cfFiles = toCloudflareFiles(dropConfig);

    // Write _headers and _redirects to filesDir
    if (cfFiles._headers) {
      const headersPath = join(filesDir, '_headers');
      await writeFile(headersPath, cfFiles._headers);
      ctx.logger.info('[Cloudflare Pages] Generated _headers from _drop.json');
    }

    if (cfFiles._redirects) {
      const redirectsPath = join(filesDir, '_redirects');
      await writeFile(redirectsPath, cfFiles._redirects);
      ctx.logger.info('[Cloudflare Pages] Generated _redirects from _drop.json');
    }

    // Determine project name
    const projectName = config.projectName || site.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Ensure project exists
    await this.ensureProject(ctx, config, projectName);

    // Collect all files
    const files = await this.collectFiles(filesDir);
    ctx.logger.info(`[Cloudflare Pages] Collected ${files.length} files`);

    // Create deployment
    const deployment = await this.createDeployment(
      ctx,
      config,
      projectName,
      files,
      filesDir,
    );

    ctx.logger.info(`[Cloudflare Pages] Deployment created: ${deployment.id}`);
    ctx.logger.info(`[Cloudflare Pages] Preview URL: ${deployment.url}`);

    return {
      destinationRef: deployment.url,
      platformDeploymentId: deployment.id,
      previewUrl: deployment.url,
    };
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput & { target?: string; platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const target = (input as any).target || 'preview';
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (target === 'production' && platformDeploymentId) {
      ctx.logger.info(`[Cloudflare Pages] Promoting deployment ${platformDeploymentId} to production`);
      await this.promoteToProduction(ctx, config, platformDeploymentId);
      ctx.logger.info('[Cloudflare Pages] Deployment promoted to production');
    } else {
      ctx.logger.info('[Cloudflare Pages] Preview deployment already active');
    }
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput & { platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Cloudflare Pages rollback');
    }

    ctx.logger.info(`[Cloudflare Pages] Rolling back to deployment ${platformDeploymentId}`);
    await this.promoteToProduction(ctx, config, platformDeploymentId);
    ctx.logger.info('[Cloudflare Pages] Rollback complete');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    const projectName = c.projectName;

    if (!projectName) {
      return [];
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/pages/projects/${projectName}/deployments`;
    const headers = this.getHeaders(c);

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const deployments = data.result || [];

      return deployments.map((d: any) => ({
        deployId: d.id,
        active: d.environment === 'production',
        createdAt: d.created_on,
      }));
    } catch (error) {
      ctx.logger.error(`[Cloudflare Pages] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async ensureProject(
    ctx: AdapterContext,
    config: any,
    projectName: string,
  ): Promise<void> {
    ctx.logger.info(`[Cloudflare Pages] Ensuring project exists: ${projectName}`);

    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${projectName}`;
    const headers = this.getHeaders(config);

    // Check if project exists
    try {
      const response = await fetch(url, { headers });

      if (response.ok) {
        ctx.logger.info(`[Cloudflare Pages] Project exists: ${projectName}`);
        return;
      }
    } catch (error) {
      // Project doesn't exist, will create
    }

    // Create project
    ctx.logger.info(`[Cloudflare Pages] Creating project: ${projectName}`);
    const createUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects`;

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        production_branch: 'main',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create Cloudflare Pages project: ${createResponse.status} ${error}`);
    }

    ctx.logger.info(`[Cloudflare Pages] Project created: ${projectName}`);
  }

  private async createDeployment(
    ctx: AdapterContext,
    config: any,
    projectName: string,
    files: Array<{ fullPath: string; relativePath: string }>,
    filesDir: string,
  ): Promise<{ id: string; url: string }> {
    ctx.logger.info('[Cloudflare Pages] Creating deployment...');

    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${projectName}/deployments`;
    const headers = this.getHeaders(config);

    // Build form data with all files
    const formData = new FormData();

    // Create manifest of all files
    const manifest: Record<string, string> = {};
    for (const file of files) {
      manifest[`/${file.relativePath}`] = file.relativePath;
    }

    // Add manifest
    formData.append('manifest', JSON.stringify(manifest));

    // Add all files
    for (const file of files) {
      const content = await readFile(file.fullPath);
      formData.append(file.relativePath, content, {
        filename: file.relativePath,
        contentType: this.getMimeType(file.relativePath),
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Cloudflare Pages deployment: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    const deployment = data.result;

    return {
      id: deployment.id,
      url: deployment.url,
    };
  }

  private async promoteToProduction(
    ctx: AdapterContext,
    config: any,
    deploymentId: string,
  ): Promise<void> {
    const projectName = config.projectName;

    if (!projectName) {
      throw new Error('projectName is required for promotion');
    }

    // In Cloudflare Pages, promoting to production means creating a production deployment
    // from the same source. The API may vary, but typically we'd use:
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${projectName}/deployments/${deploymentId}/retry`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: 'production',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to promote Cloudflare Pages deployment: ${response.status} ${error}`);
    }
  }

  private getHeaders(config: any): Record<string, string> {
    return {
      Authorization: `Bearer ${config.apiToken}`,
    };
  }

  private async collectFiles(
    dir: string,
  ): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const files: Array<{ fullPath: string; relativePath: string }> = [];

    async function scan(currentPath: string, basePath: string) {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        // Skip hidden files and directories (except .well-known)
        if (entry.name.startsWith('.') && entry.name !== '.well-known') {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath, basePath);
        } else if (entry.isFile()) {
          const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
          files.push({ fullPath, relativePath });
        }
      }
    }

    await scan(dir, dir);
    return files;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

