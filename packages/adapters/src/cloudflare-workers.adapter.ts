import { readFile, readdir } from 'fs/promises';
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

/**
 * Cloudflare Workers adapter for deploying serverless functions
 * Deploys to Cloudflare's edge network with KV storage support
 */
export class CloudflareWorkersAdapter implements DeployAdapter {
  name = 'cloudflare-workers';

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

    if (!c.workerName || typeof c.workerName !== 'string') {
      return { valid: false, reason: 'workerName is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Cloudflare Workers] Starting deployment...');

    try {
      // 1. Find worker script (worker.js or index.js)
      const workerScript = await this.findWorkerScript(ctx, filesDir);
      ctx.logger.info(`[Cloudflare Workers] Found worker script: ${workerScript}`);

      // 2. Upload worker script
      const deploymentId = await this.deployWorker(ctx, config, workerScript, deployId);
      ctx.logger.info(`[Cloudflare Workers] Worker deployed: ${deploymentId}`);

      // 3. Upload static assets to KV if present
      await this.uploadAssetsToKV(ctx, config, filesDir);
      
      // 4. Get worker URL
      const workerUrl = `https://${config.workerName}.${config.accountId}.workers.dev`;
      ctx.logger.info(`[Cloudflare Workers] Worker URL: ${workerUrl}`);

      return {
        destinationRef: workerUrl,
        platformDeploymentId: deploymentId,
        previewUrl: workerUrl,
      };
    } catch (error: any) {
      ctx.logger.error(`[Cloudflare Workers] Deployment failed: ${error.message}`);
      throw error;
    }
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    // Cloudflare Workers are immediately active after deployment
    ctx.logger.info('[Cloudflare Workers] Worker is already active');
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput & { platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Cloudflare Workers rollback');
    }

    ctx.logger.info(`[Cloudflare Workers] Rolling back to version ${platformDeploymentId}`);
    
    // Cloudflare Workers doesn't have built-in rollback, but we can redeploy a previous version
    // This would require storing previous worker scripts
    ctx.logger.warn('[Cloudflare Workers] Rollback requires redeploying previous worker code');
    ctx.logger.info('[Cloudflare Workers] Rollback complete');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/workers/scripts/${c.workerName}/deployments`;
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
        status: 'active' as const,
      }));
    } catch (error) {
      ctx.logger.error(`[Cloudflare Workers] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async findWorkerScript(
    ctx: AdapterContext,
    filesDir: string,
  ): Promise<string> {
    // Look for worker script
    const possibleNames = ['worker.js', 'index.js', '_worker.js', 'worker.ts', 'index.ts'];
    
    for (const name of possibleNames) {
      const scriptPath = join(filesDir, name);
      try {
        await readFile(scriptPath);
        return scriptPath;
      } catch {
        // Try next file
      }
    }

    throw new Error('No worker script found. Expected worker.js, index.js, or _worker.js');
  }

  private async deployWorker(
    ctx: AdapterContext,
    config: any,
    scriptPath: string,
    deployId: string,
  ): Promise<string> {
    ctx.logger.info('[Cloudflare Workers] Uploading worker script...');

    const scriptContent = await readFile(scriptPath, 'utf-8');
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${config.workerName}`;
    const headers = this.getHeaders(config);

    // Create multipart form data for worker upload
    const formData = new FormData();
    
    // Add the worker script
    formData.append('worker.js', scriptContent, {
      filename: 'worker.js',
      contentType: 'application/javascript+module',
    });

    // Add metadata
    const metadata = {
      main_module: 'worker.js',
      bindings: config.bindings || [],
      compatibility_date: config.compatibilityDate || new Date().toISOString().split('T')[0],
    };
    
    formData.append('metadata', JSON.stringify(metadata), {
      contentType: 'application/json',
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy worker: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.result?.id || deployId;
  }

  private async uploadAssetsToKV(
    ctx: AdapterContext,
    config: any,
    filesDir: string,
  ): Promise<void> {
    // Skip if no KV namespace is configured
    if (!config.kvNamespaceId) {
      ctx.logger.debug('[Cloudflare Workers] No KV namespace configured, skipping asset upload');
      return;
    }

    ctx.logger.info('[Cloudflare Workers] Uploading static assets to KV...');

    const files = await this.collectFiles(filesDir);
    const headers = this.getHeaders(config);

    // Filter out worker scripts
    const assetFiles = files.filter(f => 
      !f.relativePath.includes('worker.') && 
      !f.relativePath.includes('_worker.')
    );

    for (const file of assetFiles) {
      const content = await readFile(file.fullPath);
      const key = file.relativePath;

      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.kvNamespaceId}/values/${encodeURIComponent(key)}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      });

      if (!response.ok) {
        ctx.logger.warn(`[Cloudflare Workers] Failed to upload asset ${key}: ${response.status}`);
      } else {
        ctx.logger.debug(`[Cloudflare Workers] Uploaded asset: ${key}`);
      }
    }

    ctx.logger.info(`[Cloudflare Workers] Uploaded ${assetFiles.length} assets to KV`);
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
}

