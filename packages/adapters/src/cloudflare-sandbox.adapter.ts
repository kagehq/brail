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
 * Cloudflare Sandbox adapter for secure code execution in isolated containers
 * Based on: https://developers.cloudflare.com/sandbox/
 * 
 * Cloudflare Sandbox is built on Containers and provides isolated environments
 * for executing untrusted code, perfect for AI agents, data analysis, and CI/CD.
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

    if (!c.sandboxBinding || typeof c.sandboxBinding !== 'string') {
      return { valid: false, reason: 'sandboxBinding is required (Durable Object binding name)' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Cloudflare Sandbox] Starting sandbox deployment...');
    ctx.logger.info('[Cloudflare Sandbox] Note: Sandboxes run in isolated containers powered by Durable Objects');

    try {
      // Step 1: Create a Worker that uses the Sandbox SDK
      const workerScript = await this.createSandboxWorker(ctx, config, filesDir);
      ctx.logger.info('[Cloudflare Sandbox] Created Worker with Sandbox SDK integration');

      // Step 2: Deploy the Worker to Cloudflare
      const workerId = await this.deployWorker(ctx, config, workerScript, deployId);
      ctx.logger.info(`[Cloudflare Sandbox] Worker deployed: ${workerId}`);

      // Step 3: Create a sandbox session
      const sessionId = await this.createSandboxSession(ctx, config, deployId);
      ctx.logger.info(`[Cloudflare Sandbox] Sandbox session created: ${sessionId}`);

      // Step 4: Upload files to sandbox
      await this.uploadFilesToSandbox(ctx, config, sessionId, filesDir);
      ctx.logger.info('[Cloudflare Sandbox] Files uploaded to sandbox');

      // Step 5: Execute setup/build commands if specified
      if (config.buildCommand) {
        ctx.logger.info(`[Cloudflare Sandbox] Executing build command: ${config.buildCommand}`);
        await this.executeCommand(ctx, config, sessionId, config.buildCommand);
      }

      // Step 6: Start the application if specified
      if (config.startCommand) {
        ctx.logger.info(`[Cloudflare Sandbox] Starting application: ${config.startCommand}`);
        await this.executeCommand(ctx, config, sessionId, config.startCommand, true);
      }

      // Step 7: Get preview URL
      const previewUrl = await this.getPreviewUrl(ctx, config, sessionId);
      ctx.logger.info(`[Cloudflare Sandbox] Preview URL: ${previewUrl}`);

      return {
        destinationRef: previewUrl,
        platformDeploymentId: sessionId,
        previewUrl,
      };
    } catch (error: any) {
      ctx.logger.error(`[Cloudflare Sandbox] Deployment failed: ${error.message}`);
      throw error;
    }
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    // Cloudflare Sandbox sessions are active immediately after creation
    ctx.logger.info('[Cloudflare Sandbox] Sandbox is already active and running');
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

    ctx.logger.info(`[Cloudflare Sandbox] Rolling back to session ${platformDeploymentId}`);
    
    // Cloudflare Sandbox doesn't have traditional rollback
    // You would need to stop the current session and recreate from previous state
    ctx.logger.warn('[Cloudflare Sandbox] Rollback requires recreating sandbox from previous state');
    
    await this.terminateSandboxSession(ctx, config, platformDeploymentId);
    ctx.logger.info('[Cloudflare Sandbox] Previous session terminated');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    
    try {
      // List sandbox sessions via Workers API
      const url = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/workers/durable_objects/namespaces/${c.sandboxBinding}/objects`;
      const headers = this.getHeaders(c);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const sessions = data.result || [];

      return sessions.map((s: any) => ({
        id: s.id,
        timestamp: s.created_on || new Date().toISOString(),
        status: 'active' as const,
      }));
    } catch (error) {
      ctx.logger.error(`[Cloudflare Sandbox] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async createSandboxWorker(
    ctx: AdapterContext,
    config: any,
    filesDir: string,
  ): Promise<string> {
    // Create a Worker script that uses the Cloudflare Sandbox SDK
    // Based on: https://developers.cloudflare.com/sandbox/
    
    const workerScript = `
import { getSandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session') || 'default';
    
    // Get sandbox instance for this session
    const sandbox = getSandbox(env.${config.sandboxBinding}, sessionId);
    
    // Handle different endpoints
    if (url.pathname === '/exec') {
      const { command } = await request.json();
      const result = await sandbox.exec(command);
      return Response.json({
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        success: result.success
      });
    }
    
    if (url.pathname === '/upload') {
      const { path, content } = await request.json();
      await sandbox.writeFile(path, content);
      return Response.json({ success: true });
    }
    
    if (url.pathname === '/read') {
      const { path } = await request.json();
      const content = await sandbox.readFile(path);
      return Response.json({ content });
    }
    
    if (url.pathname === '/code') {
      const { code, language } = await request.json();
      const ctx = await sandbox.createCodeContext({ language });
      const result = await sandbox.runCode(code, { context: ctx });
      return Response.json({
        result: result.results,
        logs: result.logs
      });
    }
    
    // Default: return sandbox info
    return Response.json({
      sandbox: 'active',
      sessionId,
      message: 'Cloudflare Sandbox is running'
    });
  }
};
`;

    return workerScript;
  }

  private async deployWorker(
    ctx: AdapterContext,
    config: any,
    workerScript: string,
    deployId: string,
  ): Promise<string> {
    const workerName = config.workerName || `sandbox-${deployId}`;
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${workerName}`;
    const headers = this.getHeaders(config);

    // Upload worker script with Sandbox binding
    const formData = new FormData();
    
    // Add the worker script
    formData.append('worker.js', new Blob([workerScript], { type: 'application/javascript+module' }));

    // Add metadata with Durable Object binding
    const metadata = {
      main_module: 'worker.js',
      bindings: [
        {
          type: 'durable_object_namespace',
          name: config.sandboxBinding,
          class_name: 'Sandbox',
          script_name: workerName,
        }
      ],
      compatibility_date: new Date().toISOString().split('T')[0],
    };
    
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy worker: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.result?.id || deployId;
  }

  private async createSandboxSession(
    ctx: AdapterContext,
    config: any,
    sessionId: string,
  ): Promise<string> {
    // Sandbox sessions are created automatically when first accessed
    // via the Worker's getSandbox() call
    ctx.logger.debug('[Cloudflare Sandbox] Session will be created on first access');
    return sessionId;
  }

  private async uploadFilesToSandbox(
    ctx: AdapterContext,
    config: any,
    sessionId: string,
    filesDir: string,
  ): Promise<void> {
    const files = await this.collectFiles(filesDir);
    const workerUrl = `https://${config.workerName || 'sandbox'}.${config.accountId}.workers.dev`;

    ctx.logger.info(`[Cloudflare Sandbox] Uploading ${files.length} files...`);

    for (const file of files) {
      const content = await readFile(file.fullPath, 'utf-8');
      const path = `/workspace/${file.relativePath}`;

      await fetch(`${workerUrl}/upload?session=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });

      ctx.logger.debug(`[Cloudflare Sandbox] Uploaded: ${file.relativePath}`);
    }
  }

  private async executeCommand(
    ctx: AdapterContext,
    config: any,
    sessionId: string,
    command: string,
    detached = false,
  ): Promise<void> {
    const workerUrl = `https://${config.workerName || 'sandbox'}.${config.accountId}.workers.dev`;

    const response = await fetch(`${workerUrl}/exec?session=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute command: ${response.status}`);
    }

    const result: any = await response.json();
    
    if (result.output) {
      ctx.logger.info(`[Cloudflare Sandbox] Output: ${result.output}`);
    }
    
    if (result.error) {
      ctx.logger.warn(`[Cloudflare Sandbox] Error: ${result.error}`);
    }

    if (!detached && result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}`);
    }
  }

  private async getPreviewUrl(
    ctx: AdapterContext,
    config: any,
    sessionId: string,
  ): Promise<string> {
    // Cloudflare Sandbox automatically generates preview URLs for exposed services
    // The preview URL format is based on the port exposed
    const port = config.port || 8080;
    
    // Preview URLs are automatically generated by Cloudflare Sandbox
    // Format: https://{random-id}.{session-id}.cloudflaresandbox.com
    return `https://${config.workerName || 'sandbox'}.${config.accountId}.workers.dev?session=${sessionId}`;
  }

  private async terminateSandboxSession(
    ctx: AdapterContext,
    config: any,
    sessionId: string,
  ): Promise<void> {
    // Terminate sandbox session via Durable Objects API
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/durable_objects/namespaces/${config.sandboxBinding}/objects/${sessionId}`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Failed to terminate sandbox: ${response.status} ${error}`);
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
