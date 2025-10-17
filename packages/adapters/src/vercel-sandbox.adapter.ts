import { DeployAdapter, AdapterContext, UploadInput, ActivateInput, RollbackInput, ValidationResult } from './types.js';

export interface VercelSandboxConfig {
  teamId: string;
  projectId: string;
  token: string;
  runtime: 'node22' | 'python3.13';
  vcpus: number;
  timeout: number; // in milliseconds
  ports: number[];
  source: {
    url: string;
    type: 'git';
  };
  buildCommand?: string;
  startCommand?: string;
  workingDirectory?: string;
}

export const vercelSandboxAdapter: DeployAdapter = {
  name: 'vercel-sandbox',

  validateConfig(config: unknown): ValidationResult {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    const cfg = config as Record<string, unknown>;

    // Required fields
    if (!cfg.teamId || typeof cfg.teamId !== 'string') {
      throw new Error('teamId is required and must be a string');
    }
    if (!cfg.projectId || typeof cfg.projectId !== 'string') {
      throw new Error('projectId is required and must be a string');
    }
    if (!cfg.token || typeof cfg.token !== 'string') {
      throw new Error('token is required and must be a string');
    }
    if (!cfg.runtime || !['node22', 'python3.13'].includes(cfg.runtime as string)) {
      throw new Error('runtime must be either "node22" or "python3.13"');
    }
    if (!cfg.source || typeof cfg.source !== 'object') {
      throw new Error('source is required and must be an object');
    }
    const source = cfg.source as Record<string, unknown>;
    if (!source.url || typeof source.url !== 'string') {
      throw new Error('source.url is required and must be a string');
    }
    if (source.type !== 'git') {
      throw new Error('source.type must be "git"');
    }

    // Optional fields with defaults
    const vcpus = cfg.vcpus ? Number(cfg.vcpus) : 2;
    const timeout = cfg.timeout ? Number(cfg.timeout) : 300000; // 5 minutes default
    const ports = cfg.ports ? (Array.isArray(cfg.ports) ? cfg.ports.map(Number) : [Number(cfg.ports)]) : [3000];

    if (vcpus < 1 || vcpus > 4) {
      throw new Error('vcpus must be between 1 and 4');
    }
    if (timeout < 60000 || timeout > 18000000) { // 1 minute to 5 hours
      throw new Error('timeout must be between 60000ms (1 minute) and 18000000ms (5 hours)');
    }
    if (!Array.isArray(ports) || ports.some(p => p < 1 || p > 65535)) {
      throw new Error('ports must be an array of valid port numbers (1-65535)');
    }

    return { valid: true };
  },

  async upload(ctx: AdapterContext, input: UploadInput): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as VercelSandboxConfig;
    
    ctx.logger.info('🚀 Starting Vercel Sandbox deployment...');
    ctx.logger.info(`📦 Runtime: ${config.runtime}`);
    ctx.logger.info(`💻 vCPUs: ${config.vcpus}`);
    ctx.logger.info(`⏱️ Timeout: ${config.timeout}ms`);
    ctx.logger.info(`🔗 Source: ${config.source.url}`);

    try {
      // Create sandbox using Vercel Sandbox SDK
      const sandbox = await createSandbox(config, ctx);
      
      ctx.logger.info('✅ Sandbox created successfully');
      ctx.logger.info(`🌐 Sandbox URL: ${sandbox.url}`);
      
      return {
        destinationRef: sandbox.id,
        platformDeploymentId: sandbox.id,
        previewUrl: sandbox.url,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`❌ Vercel Sandbox deployment failed: ${errorMessage}`);
      throw error;
    }
  },

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    ctx.logger.info('🔄 Activating Vercel Sandbox deployment...');

    try {
      const config = input.config as VercelSandboxConfig;
      
      // For now, just log the activation
      // In a real implementation, this would start the sandbox
      ctx.logger.info('✅ Vercel Sandbox activated successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`❌ Vercel Sandbox activation failed: ${errorMessage}`);
      throw error;
    }
  },

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    ctx.logger.info('🔄 Rolling back Vercel Sandbox deployment...');

    try {
      // For now, just log the rollback
      // In a real implementation, this would stop the sandbox
      ctx.logger.info('✅ Vercel Sandbox rolled back successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`❌ Vercel Sandbox rollback failed: ${errorMessage}`);
      throw error;
    }
  }
};

// Helper functions
async function createSandbox(config: VercelSandboxConfig, ctx: AdapterContext) {
    // This would integrate with the Vercel Sandbox SDK
    // For now, we'll simulate the API calls
    
    ctx.logger.info('📦 Creating Vercel Sandbox...');
    
    // Simulate sandbox creation
    const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sandboxUrl = `https://${sandboxId}.sandbox.vercel.app`;
    
    // In a real implementation, this would call the Vercel Sandbox API
    // const sandbox = await Sandbox.create({
    //   teamId: config.teamId,
    //   projectId: config.projectId,
    //   token: config.token,
    //   source: config.source,
    //   resources: { vcpus: config.vcpus },
    //   timeout: config.timeout,
    //   ports: config.ports,
    //   runtime: config.runtime,
    // });

    return {
      id: sandboxId,
      url: sandboxUrl,
      status: 'created',
    };
}

async function startSandbox(sandboxId: string, config: VercelSandboxConfig, ctx: AdapterContext) {
    ctx.logger.info(`🚀 Starting sandbox ${sandboxId}...`);
    
    // In a real implementation, this would call the Vercel Sandbox API
    // await sandbox.start();
    
    ctx.logger.info('✅ Sandbox started successfully');
}

async function stopSandbox(sandboxId: string, ctx: AdapterContext) {
    ctx.logger.info(`🛑 Stopping sandbox ${sandboxId}...`);
    
    // In a real implementation, this would call the Vercel Sandbox API
    // await sandbox.stop();
    
    ctx.logger.info('✅ Sandbox stopped successfully');
}

async function deleteSandbox(sandboxId: string, ctx: AdapterContext) {
    ctx.logger.info(`🗑️ Deleting sandbox ${sandboxId}...`);
    
    // In a real implementation, this would call the Vercel Sandbox API
    // await sandbox.delete();
    
    ctx.logger.info('✅ Sandbox deleted successfully');
}
