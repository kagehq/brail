import { DeployAdapter, AdapterContext, UploadInput, ActivateInput, RollbackInput, ValidationResult } from './types.js';
import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';

export interface VercelSandboxConfig {
  token: string; // Vercel API token
  teamId?: string; // Optional team ID
  projectName: string; // Project name
}

export const vercelSandboxAdapter: DeployAdapter = {
  name: 'vercel-sandbox',

  validateConfig(config: unknown): ValidationResult {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    const cfg = config as Record<string, unknown>;

    // Required fields
    if (!cfg.token || typeof cfg.token !== 'string') {
      throw new Error('token is required and must be a string');
    }
    if (!cfg.projectName || typeof cfg.projectName !== 'string') {
      throw new Error('projectName is required and must be a string');
    }

    return { valid: true };
  },

  async upload(ctx: AdapterContext, input: UploadInput): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as VercelSandboxConfig;
    
    ctx.logger.info('🚀 Starting Vercel deployment...');
    ctx.logger.info(`📦 Project: ${config.projectName}`);

    try {
      // Collect all files
      const files = await collectFiles(input.filesDir);
      ctx.logger.info(`📁 Found ${files.length} files to deploy`);

      // Create deployment payload
      const fileContents: Record<string, { data: string }> = {};
      
      for (const file of files) {
        const content = await readFile(file.fullPath);
        fileContents[file.relativePath] = {
          data: content.toString('base64'),
        };
      }

      // Create deployment using Vercel API
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      };

      if (config.teamId) {
        headers['x-vercel-team-id'] = config.teamId;
      }

      const deploymentPayload = {
        name: config.projectName,
        files: fileContents,
        projectSettings: {
          framework: null, // Auto-detect
        },
        target: 'preview', // Create as preview deployment
      };

      ctx.logger.info('📤 Uploading files to Vercel...');
      
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers,
        body: JSON.stringify(deploymentPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vercel API error (${response.status}): ${errorText}`);
      }

      const deployment = await response.json() as any;
      
      ctx.logger.info('✅ Deployment created successfully');
      ctx.logger.info(`🆔 Deployment ID: ${deployment.id}`);
      
      // Construct preview URL
      const previewUrl = `https://${deployment.url}`;
      ctx.logger.info(`🌐 Preview URL: ${previewUrl}`);
      
      // Wait for deployment to be ready
      ctx.logger.info('⏳ Waiting for deployment to be ready...');
      const readyUrl = await waitForDeployment(deployment.id, config.token, config.teamId, ctx);
      
      return {
        destinationRef: deployment.url,
        platformDeploymentId: deployment.id,
        previewUrl: readyUrl || previewUrl,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`❌ Vercel deployment failed: ${errorMessage}`);
      throw error;
    }
  },

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    // For Vercel, the deployment is already live once uploaded
    // This is a no-op since Vercel deployments are immediately accessible
    ctx.logger.info('✅ Vercel deployment is already live');
  },

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    ctx.logger.info('🔄 Rolling back Vercel deployment...');
    
    // Vercel doesn't have a traditional rollback API
    // You would need to promote a different deployment to production
    // For now, we'll just log that this operation is not supported
    
    ctx.logger.warn('⚠️  Vercel rollback requires promoting another deployment via the dashboard');
    ctx.logger.info('✅ Rollback acknowledgement complete');
  }
};

/**
 * Wait for Vercel deployment to be ready
 */
async function waitForDeployment(
  deploymentId: string,
  token: string,
  teamId: string | undefined,
  ctx: AdapterContext,
  maxWaitMs: number = 300000 // 5 minutes
): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  if (teamId) {
    headers['x-vercel-team-id'] = teamId;
  }

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers,
      });

      if (!response.ok) {
        ctx.logger.warn(`Failed to check deployment status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      const deployment = await response.json() as any;
      
      if (deployment.readyState === 'READY') {
        ctx.logger.info('✅ Deployment is ready!');
        return `https://${deployment.url}`;
      }
      
      if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${deployment.readyState}`);
      }
      
      // Still building
      ctx.logger.info(`⏳ Deployment status: ${deployment.readyState}...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Deployment failed')) {
        throw error;
      }
      // Network error, retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  // Timeout - deployment might still be building
  ctx.logger.warn('⚠️  Deployment is still building (timeout reached)');
  return null;
}

/**
 * Recursively collect all files from a directory
 */
async function collectFiles(
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

      // Skip node_modules
      if (entry.name === 'node_modules') {
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
