import { readFile, readdir, writeFile, mkdtemp, rm } from 'fs/promises';
import { join, relative } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { DeployAdapter, AdapterContext, UploadInput, ActivateInput, RollbackInput, ValidationResult } from './types.js';

export interface VercelSandboxConfig {
  teamId?: string;
  projectId?: string;
  token: string;
  runtime: 'node22' | 'python3.13';
  vcpus?: number;
  timeout?: number; // in milliseconds
  ports?: number[];
  buildCommand?: string;
  startCommand?: string;
  workingDirectory?: string;
}

export const vercelSandboxAdapter: DeployAdapter = {
  name: 'vercel-sandbox',

  validateConfig(config: unknown): ValidationResult {
    if (!config || typeof config !== 'object') {
      return { valid: false, reason: 'Config must be an object' };
    }

    const cfg = config as Record<string, unknown>;

    if (!cfg.token || typeof cfg.token !== 'string') {
      return { valid: false, reason: 'token is required' };
    }

    if (!cfg.runtime || !['node22', 'python3.13'].includes(cfg.runtime as string)) {
      return { valid: false, reason: 'runtime must be either "node22" or "python3.13"' };
    }

    return { valid: true };
  },

  async upload(ctx: AdapterContext, input: UploadInput): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as VercelSandboxConfig;
    const { deployId, filesDir, site } = input;
    
    ctx.logger.info('[Vercel Sandbox] Starting sandbox creation...');
    ctx.logger.info(`[Vercel Sandbox] Runtime: ${config.runtime}`);
    ctx.logger.info(`[Vercel Sandbox] vCPUs: ${config.vcpus || 2}`);

    try {
      // Step 1: Create a temporary git repository from files
      const gitRepoUrl = await createTempGitRepo(ctx, filesDir, deployId);
      ctx.logger.info(`[Vercel Sandbox] Created temporary git repo: ${gitRepoUrl}`);

      // Step 2: Create the sandbox via Vercel Sandbox API
      const sandbox = await createSandbox(ctx, config, gitRepoUrl);
      ctx.logger.info(`[Vercel Sandbox] Sandbox created: ${sandbox.id}`);

      // Step 3: Run build command if specified
      if (config.buildCommand) {
        ctx.logger.info(`[Vercel Sandbox] Running build command: ${config.buildCommand}`);
        await runSandboxCommand(ctx, config, sandbox.id, config.buildCommand);
      }

      // Step 4: Start the application
      const startCommand = config.startCommand || 'npm start';
      ctx.logger.info(`[Vercel Sandbox] Starting application: ${startCommand}`);
      await runSandboxCommand(ctx, config, sandbox.id, startCommand, true);

      // Step 5: Get the sandbox URL
      const port = config.ports?.[0] || 3000;
      const sandboxUrl = `https://${sandbox.id}.sandbox.vercel.app`;
      ctx.logger.info(`[Vercel Sandbox] Sandbox URL: ${sandboxUrl}`);

      return {
        destinationRef: sandboxUrl,
        platformDeploymentId: sandbox.id,
        previewUrl: sandboxUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`[Vercel Sandbox] Deployment failed: ${errorMessage}`);
      throw error;
    }
  },

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    // Vercel Sandbox is already active after creation
    ctx.logger.info('[Vercel Sandbox] Sandbox is already active and running');
  },

  async rollback(ctx: AdapterContext, input: RollbackInput & { platformDeploymentId?: string }): Promise<void> {
    const config = input.config as VercelSandboxConfig;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Vercel Sandbox rollback');
    }

    ctx.logger.info(`[Vercel Sandbox] Stopping current sandbox and starting previous: ${platformDeploymentId}`);
    
    // Vercel Sandbox doesn't have traditional rollback
    // You would need to stop the current sandbox and create a new one from the old code
    ctx.logger.warn('[Vercel Sandbox] Rollback requires recreating sandbox from previous code version');
    
    await stopSandbox(ctx, config, platformDeploymentId);
    ctx.logger.info('[Vercel Sandbox] Sandbox stopped');
  }
};

// Helper functions

/**
 * Create a temporary git repository from local files
 * In a real implementation, this would either:
 * 1. Push files to a temporary GitHub Gist
 * 2. Use GitHub API to create a temporary repo
 * 3. Upload files directly via Vercel's file API (if available)
 * 
 * For now, this is a simplified implementation that shows the concept
 */
async function createTempGitRepo(
  ctx: AdapterContext,
  filesDir: string,
  deployId: string,
): Promise<string> {
  ctx.logger.warn('[Vercel Sandbox] Note: Vercel Sandbox requires a git repository URL');
  ctx.logger.warn('[Vercel Sandbox] In production, you would need to push files to a git repository');
  
  // For demonstration purposes, return a placeholder URL
  // In a real implementation, you would:
  // 1. Create a temporary GitHub repo or gist
  // 2. Commit and push the files
  // 3. Return the repo URL
  
  return `https://github.com/temp/${deployId}.git`;
}

/**
 * Create a Vercel Sandbox using the REST API
 * Based on: https://vercel.com/docs/vercel-sandbox
 */
async function createSandbox(
  ctx: AdapterContext,
  config: VercelSandboxConfig,
  gitRepoUrl: string,
): Promise<{ id: string }> {
  const url = 'https://api.vercel.com/v1/sandbox';
  const headers = getHeaders(config);

  const body = {
    source: {
      url: gitRepoUrl,
      type: 'git',
    },
    resources: {
      vcpus: config.vcpus || 2,
    },
    timeout: config.timeout || 300000, // 5 minutes default
    ports: config.ports || [3000],
    runtime: config.runtime,
    ...(config.workingDirectory && { workingDirectory: config.workingDirectory }),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Vercel Sandbox: ${response.status} ${error}`);
  }

  const sandbox: any = await response.json();
  return {
    id: sandbox.id || sandbox.sandboxId,
  };
}

/**
 * Run a command in a Vercel Sandbox
 */
async function runSandboxCommand(
  ctx: AdapterContext,
  config: VercelSandboxConfig,
  sandboxId: string,
  command: string,
  detached = false,
): Promise<void> {
  const url = `https://api.vercel.com/v1/sandbox/${sandboxId}/commands`;
  const headers = getHeaders(config);

  // Parse command into cmd and args
  const parts = command.split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);

  const body = {
    cmd,
    args,
    detached,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run sandbox command: ${response.status} ${error}`);
  }

  if (!detached) {
    const result: any = await response.json();
    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}`);
    }
  }
}

/**
 * Stop a Vercel Sandbox
 */
async function stopSandbox(
  ctx: AdapterContext,
  config: VercelSandboxConfig,
  sandboxId: string,
): Promise<void> {
  const url = `https://api.vercel.com/v1/sandbox/${sandboxId}`;
  const headers = getHeaders(config);

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to stop sandbox: ${response.status} ${error}`);
  }
}

function getHeaders(config: VercelSandboxConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
  };

  if (config.teamId) {
    headers['x-vercel-team-id'] = config.teamId;
  }

  if (config.projectId) {
    headers['x-vercel-project-id'] = config.projectId;
  }

  return headers;
}
