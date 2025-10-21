import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ReleaseInfo,
  ValidationResult,
} from './types.js';

export interface CloudflarePagesConfig {
  accountId: string;
  apiToken: string;
  projectName: string;
  productionBranch?: string;
}

/**
 * Cloudflare Pages adapter for deploying static sites
 * Uses Cloudflare Pages Direct Upload API
 */
export class CloudflareSandboxAdapter implements DeployAdapter {
  name = 'cloudflare-sandbox';

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

    if (!c.projectName || typeof c.projectName !== 'string') {
      return { valid: false, reason: 'projectName is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as CloudflarePagesConfig;
    const { deployId, filesDir } = input;

    ctx.logger.info('[Cloudflare Pages] Starting deployment...');

    try {
      // Ensure project exists
      await this.ensureProject(ctx, config);

      // Collect files
      const files = await this.collectFiles(filesDir);
      ctx.logger.info(`[Cloudflare Pages] Found ${files.length} files`);

      // Create deployment
      const deployment = await this.createDeployment(ctx, config, files, deployId);
      
      ctx.logger.info(`[Cloudflare Pages] Deployment created: ${deployment.id}`);
      ctx.logger.info(`[Cloudflare Pages] Preview URL: ${deployment.url}`);

      return {
        destinationRef: deployment.url,
        platformDeploymentId: deployment.id,
        previewUrl: deployment.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`[Cloudflare Pages] Deployment failed: ${errorMessage}`);
      throw error;
    }
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    // Cloudflare Pages deployments are automatically live
    // To promote to production, you'd need to set it as the production deployment
    ctx.logger.info('[Cloudflare Pages] Deployment is already live');
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput,
  ): Promise<void> {
    const config = input.config as CloudflarePagesConfig;
    
    ctx.logger.info('[Cloudflare Pages] Rollback initiated');
    ctx.logger.warn('[Cloudflare Pages] Manual rollback via dashboard recommended');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as CloudflarePagesConfig;
    
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/pages/projects/${c.projectName}/deployments`;
      const headers = this.getHeaders(c);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const deployments = data.result || [];

      return deployments.map((d: any) => ({
        id: d.id,
        timestamp: d.created_on,
        status: d.latest_stage?.status === 'success' ? 'active' : 'staged',
      }));
    } catch (error) {
      ctx.logger.error(`[Cloudflare Pages] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async ensureProject(
    ctx: AdapterContext,
    config: CloudflarePagesConfig,
  ): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${config.projectName}`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, { headers });

    if (response.ok) {
      ctx.logger.info('[Cloudflare Pages] Project exists');
      return;
    }

    if (response.status === 404) {
      // Project doesn't exist, create it
      ctx.logger.info('[Cloudflare Pages] Creating new project...');
      await this.createProject(ctx, config);
    } else {
      const error = await response.text();
      throw new Error(`Failed to check project: ${response.status} ${error}`);
    }
  }

  private async createProject(
    ctx: AdapterContext,
    config: CloudflarePagesConfig,
  ): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.projectName,
        production_branch: config.productionBranch || 'main',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create project: ${response.status} ${error}`);
    }

    ctx.logger.info('[Cloudflare Pages] Project created successfully');
  }

  private async createDeployment(
    ctx: AdapterContext,
    config: CloudflarePagesConfig,
    files: Array<{ fullPath: string; relativePath: string; content: Buffer }>,
    deployId: string,
  ): Promise<{ id: string; url: string }> {
    // Step 1: Create deployment
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments`;
    const headers = this.getHeaders(config);

    // Prepare manifest
    const manifest: Record<string, string> = {};
    for (const file of files) {
      // Calculate hash for each file
      const hash = await this.hashContent(file.content);
      manifest[`/${file.relativePath}`] = hash;
    }

    ctx.logger.info('[Cloudflare Pages] Creating deployment...');

    const deployResponse = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: `deploy-${deployId}`,
        manifest,
      }),
    });

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to create deployment: ${deployResponse.status} ${error}`);
    }

    const deployment = await deployResponse.json() as any;
    
    // Step 2: Upload files
    ctx.logger.info('[Cloudflare Pages] Uploading files...');
    
    for (const file of files) {
      const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments/${deployment.result.id}/files/${file.relativePath}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
        },
        body: file.content,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`Failed to upload file ${file.relativePath}: ${uploadResponse.status} ${error}`);
      }
    }

    // Step 3: Finalize deployment
    const finalizeUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments/${deployment.result.id}/finalize`;
    
    const finalizeResponse = await fetch(finalizeUrl, {
      method: 'POST',
      headers,
    });

    if (!finalizeResponse.ok) {
      const error = await finalizeResponse.text();
      throw new Error(`Failed to finalize deployment: ${finalizeResponse.status} ${error}`);
    }

    const finalized = await finalizeResponse.json() as any;
    
    return {
      id: finalized.result.id,
      url: finalized.result.url,
    };
  }

  private async hashContent(content: Buffer): Promise<string> {
    // Simple SHA-256 hash
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getHeaders(config: CloudflarePagesConfig): Record<string, string> {
    return {
      Authorization: `Bearer ${config.apiToken}`,
    };
  }

  private async collectFiles(
    dir: string,
  ): Promise<Array<{ fullPath: string; relativePath: string; content: Buffer }>> {
    const files: Array<{ fullPath: string; relativePath: string; content: Buffer }> = [];

    async function scan(currentPath: string, basePath: string) {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        // Skip hidden files and directories (except .well-known)
        if (entry.name.startsWith('.') && entry.name !== '.well-known') {
          continue;
        }

        // Skip node_modules
        if (entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath, basePath);
        } else if (entry.isFile()) {
          const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
          const content = await readFile(fullPath);
          files.push({ fullPath, relativePath, content });
        }
      }
    }

    await scan(dir, dir);
    return files;
  }
}
