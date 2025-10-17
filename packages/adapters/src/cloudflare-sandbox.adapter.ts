import { readFile, readdir, writeFile } from 'fs/promises';
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

/**
 * Cloudflare Sandbox adapter for deploying dynamic sites with server-side processing
 * Combines static file hosting with secure code execution in isolated environments
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

    // Validate sandbox configuration
    if (!c.runtime || typeof c.runtime !== 'string') {
      return { valid: false, reason: 'runtime is required (node, python, etc.)' };
    }

    if (!c.buildCommand || typeof c.buildCommand !== 'string') {
      return { valid: false, reason: 'buildCommand is required (e.g., "npm run build")' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Cloudflare Sandbox] Starting dynamic deployment...');

    // 1. Upload static files to R2 storage
    const staticFiles = await this.uploadStaticFiles(ctx, config, filesDir);
    ctx.logger.info(`[Cloudflare Sandbox] Uploaded ${staticFiles.length} static files`);

    // 2. Create sandbox environment
    const sandboxId = await this.createSandbox(ctx, config, deployId);
    ctx.logger.info(`[Cloudflare Sandbox] Created sandbox: ${sandboxId}`);

    // 3. Upload source code to sandbox
    await this.uploadSourceCode(ctx, config, sandboxId, filesDir);
    ctx.logger.info('[Cloudflare Sandbox] Uploaded source code to sandbox');

    // 4. Execute build process in sandbox
    const buildResult = await this.executeBuild(ctx, config, sandboxId);
    ctx.logger.info(`[Cloudflare Sandbox] Build completed: ${buildResult.success ? 'success' : 'failed'}`);

    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.error}`);
    }

    // 5. Start application server in sandbox
    const previewUrl = await this.startApplication(ctx, config, sandboxId);
    ctx.logger.info(`[Cloudflare Sandbox] Application started: ${previewUrl}`);

    return {
      destinationRef: previewUrl,
      platformDeploymentId: sandboxId,
      previewUrl,
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
      ctx.logger.info(`[Cloudflare Sandbox] Promoting sandbox ${platformDeploymentId} to production`);
      await this.promoteToProduction(ctx, config, platformDeploymentId);
      ctx.logger.info('[Cloudflare Sandbox] Sandbox promoted to production');
    } else {
      ctx.logger.info('[Cloudflare Sandbox] Preview deployment already active');
    }
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput & { platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Cloudflare Sandbox rollback');
    }

    ctx.logger.info(`[Cloudflare Sandbox] Rolling back to sandbox ${platformDeploymentId}`);
    await this.promoteToProduction(ctx, config, platformDeploymentId);
    ctx.logger.info('[Cloudflare Sandbox] Rollback complete');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/sandbox`;
      const headers = this.getHeaders(c);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const sandboxes = data.result || [];

      return sandboxes.map((s: any) => ({
        id: s.id,
        timestamp: s.created_at,
        status: s.status === 'active' ? 'active' : 'staged',
      }));
    } catch (error) {
      ctx.logger.error(`[Cloudflare Sandbox] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async uploadStaticFiles(
    ctx: AdapterContext,
    config: any,
    filesDir: string,
  ): Promise<Array<{ path: string; url: string }>> {
    ctx.logger.info('[Cloudflare Sandbox] Uploading static files to R2...');

    const files = await this.collectFiles(filesDir);
    const uploadedFiles: Array<{ path: string; url: string }> = [];

    for (const file of files) {
      const content = await readFile(file.fullPath);
      const uploadUrl = await this.uploadToR2(ctx, config, file.relativePath, content);
      uploadedFiles.push({ path: file.relativePath, url: uploadUrl });
    }

    return uploadedFiles;
  }

  private async createSandbox(
    ctx: AdapterContext,
    config: any,
    deployId: string,
  ): Promise<string> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/sandbox`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `brail-${deployId}`,
        runtime: config.runtime,
        timeout: config.timeout || 300, // 5 minutes default
        memory: config.memory || 128, // 128MB default
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create sandbox: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.result.id;
  }

  private async uploadSourceCode(
    ctx: AdapterContext,
    config: any,
    sandboxId: string,
    filesDir: string,
  ): Promise<void> {
    const files = await this.collectFiles(filesDir);
    
    for (const file of files) {
      const content = await readFile(file.fullPath);
      
      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/sandbox/${sandboxId}/files`;
      const headers = this.getHeaders(config);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to upload file ${file.relativePath}: ${response.status} ${error}`);
      }
    }
  }

  private async executeBuild(
    ctx: AdapterContext,
    config: any,
    sandboxId: string,
  ): Promise<{ success: boolean; error?: string; output?: string }> {
    ctx.logger.info(`[Cloudflare Sandbox] Executing build: ${config.buildCommand}`);

    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/sandbox/${sandboxId}/execute`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: config.buildCommand,
        timeout: config.buildTimeout || 300,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Build execution failed: ${response.status} ${error}` };
    }

    const data: any = await response.json();
    
    if (data.result.exitCode !== 0) {
      return { 
        success: false, 
        error: data.result.stderr || 'Build failed with non-zero exit code',
        output: data.result.stdout 
      };
    }

    return { success: true, output: data.result.stdout };
  }

  private async startApplication(
    ctx: AdapterContext,
    config: any,
    sandboxId: string,
  ): Promise<string> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/sandbox/${sandboxId}/start`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: config.startCommand || 'npm start',
        port: config.port || 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start application: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.result.previewUrl;
  }

  private async uploadToR2(
    ctx: AdapterContext,
    config: any,
    key: string,
    content: Buffer,
  ): Promise<string> {
    // This would integrate with Cloudflare R2 API
    // For now, return a placeholder URL
    return `https://r2.dev/${config.bucket}/${key}`;
  }

  private async promoteToProduction(
    ctx: AdapterContext,
    config: any,
    sandboxId: string,
  ): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/sandbox/${sandboxId}/promote`;
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
      throw new Error(`Failed to promote sandbox: ${response.status} ${error}`);
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
}
