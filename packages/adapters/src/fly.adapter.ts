import { readdir, stat, readFile, writeFile, mkdir, mkdtemp, rm, cp } from 'fs/promises';
import { join } from 'path';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
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
 * Fly.io adapter for deploying static sites
 * 
 * Fly.io deployment strategy:
 * 1. Create a Fly app (if not exists)
 * 2. Generate a minimal Dockerfile with nginx for static files
 * 3. Build and deploy via Fly.io Machines API
 * 4. Scale and configure the app
 */
export class FlyAdapter implements DeployAdapter {
  name = 'fly';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.accessToken || typeof c.accessToken !== 'string') {
      return { valid: false, reason: 'accessToken is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Fly.io] Starting deployment...');

    let deployDir: string | null = null;

    try {
      // Step 1: Ensure app exists
      const appName = config.appName || this.generateAppName(site.name);
      await this.ensureApp(ctx, config, appName);
      ctx.logger.info(`[Fly.io] Using app: ${appName}`);

      // Step 2: Prepare deployment files with Dockerfile
      deployDir = await this.prepareDeployment(ctx, filesDir, deployId);
      ctx.logger.info('[Fly.io] Deployment files prepared');

      // Step 3: Build Docker image using Fly's remote builder
      const imageName = await this.buildAndPushImage(ctx, config, appName, deployDir);
      ctx.logger.info(`[Fly.io] Image built: ${imageName}`);

      // Step 4: Deploy machine with the built image
      const machine = await this.deployMachine(ctx, config, appName, imageName);
      ctx.logger.info(`[Fly.io] Machine deployed: ${machine.id}`);

      // Step 5: Get app URL
      const appUrl = `https://${appName}.fly.dev`;
      ctx.logger.info(`[Fly.io] App URL: ${appUrl}`);

      // Cleanup temp directory
      if (deployDir) {
        await rm(deployDir, { recursive: true, force: true });
      }

      return {
        destinationRef: `fly://${appName}/${machine.id}`,
        platformDeploymentId: machine.id,
        previewUrl: appUrl,
      };
    } catch (error: any) {
      ctx.logger.error(`[Fly.io] Deployment failed: ${error.message}`);
      
      // Cleanup on error
      if (deployDir) {
        await rm(deployDir, { recursive: true, force: true }).catch(() => {});
      }
      
      throw error;
    }
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    const config = input.config as any;
    const { platformDeploymentId } = input;

    ctx.logger.info(`[Fly.io] Activating deployment: ${platformDeploymentId}`);

    // Fly.io machines are active immediately upon creation
    // For production, we might update DNS or scale the machine
    if (input.target === 'production' && platformDeploymentId) {
      ctx.logger.info('[Fly.io] Marking machine as production...');
      // Could set labels/tags on the machine to indicate production
      const appName = config.appName || this.generateAppName(input.site.name);
      await this.updateMachineLabels(ctx, config, appName, platformDeploymentId, { environment: 'production' });
    }

    ctx.logger.info('[Fly.io] Deployment activated');
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput & { platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Fly.io rollback');
    }

    ctx.logger.info(`[Fly.io] Rolling back to machine: ${platformDeploymentId}`);

    try {
      // Fly.io rollback: stop current machines and start the old one
      const appName = config.appName || this.generateAppName(input.site.name);
      
      // Get all running machines
      const machines = await this.listMachines(ctx, config, appName);
      
      // Stop current machines
      for (const machine of machines) {
        if (machine.id !== platformDeploymentId && machine.state === 'started') {
          await this.stopMachine(ctx, config, appName, machine.id);
        }
      }
      
      // Start the target machine
      await this.startMachine(ctx, config, appName, platformDeploymentId);
      
      ctx.logger.info('[Fly.io] Rollback completed');
    } catch (error: any) {
      ctx.logger.error(`[Fly.io] Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;

    try {
      const appName = c.appName || 'unknown-app';
      const machines = await this.listMachines(ctx, c, appName);
      
      return machines.map((m: any) => ({
        id: m.id,
        timestamp: new Date(m.created_at).toISOString(),
        status: m.state === 'started' ? 'active' : m.state === 'stopped' ? 'staged' : 'failed',
      }));
    } catch (error: any) {
      ctx.logger.error(`[Fly.io] Failed to list releases: ${error.message}`);
      return [];
    }
  }

  // ==================== Private Helper Methods ====================

  private async flyApi(ctx: AdapterContext, token: string, method: string, path: string, body?: any): Promise<any> {
    const url = `https://api.machines.dev/v1${path}`;
    
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fly.io API error: ${response.status} ${errorText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  private async ensureApp(ctx: AdapterContext, config: any, appName: string): Promise<void> {
    const { accessToken, org } = config;

    // Check if app exists
    try {
      await this.flyApi(ctx, accessToken, 'GET', `/apps/${appName}`);
      ctx.logger.info(`[Fly.io] App ${appName} already exists`);
      return;
    } catch (error) {
      // App doesn't exist, create it
      ctx.logger.info(`[Fly.io] Creating app: ${appName}`);
    }

    // Create app using GraphQL API
    const createBody: any = {
      app_name: appName,
      org_slug: org || 'personal',
    };

    try {
      const response = await fetch('https://api.fly.io/v1/apps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create app: ${response.status} ${error}`);
      }

      ctx.logger.info(`[Fly.io] App ${appName} created successfully`);
    } catch (error: any) {
      throw new Error(`Could not create Fly.io app: ${error.message}`);
    }
  }

  private generateAppName(prefix: string): string {
    const random = randomBytes(4).toString('hex');
    return `${prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${random}`;
  }

  private async prepareDeployment(ctx: AdapterContext, filesDir: string, deployId: string): Promise<string> {
    ctx.logger.info('[Fly.io] Preparing deployment package...');

    // Create a temporary directory for deployment
    const deployDir = await mkdtemp(join(tmpdir(), 'fly-deploy-'));

    // Generate Dockerfile
    const dockerfile = `FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Create nginx config for SPA routing with proper settings
RUN echo 'server { \\
    listen 8080; \\
    listen [::]:8080; \\
    root /usr/share/nginx/html; \\
    index index.html index.htm; \\
    \\
    # SPA routing \\
    location / { \\
        try_files \\$uri \\$uri/ /index.html =404; \\
    } \\
    \\
    # Gzip compression \\
    gzip on; \\
    gzip_vary on; \\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml; \\
    \\
    # Cache static assets \\
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ { \\
        expires 1y; \\
        add_header Cache-Control "public, immutable"; \\
    } \\
    \\
    # Security headers \\
    add_header X-Frame-Options "SAMEORIGIN" always; \\
    add_header X-Content-Type-Options "nosniff" always; \\
    add_header X-XSS-Protection "1; mode=block" always; \\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
`;

    await writeFile(join(deployDir, 'Dockerfile'), dockerfile);

    // Generate fly.toml configuration
    const flyToml = `# Fly.io configuration
[build]
  dockerfile = "Dockerfile"

[env]
  DEPLOY_ID = "${deployId}"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services.ports]]
  handlers = ["http"]
  port = 80

[[services.ports]]
  handlers = ["tls", "http"]
  port = 443
`;

    await writeFile(join(deployDir, 'fly.toml'), flyToml);

    // Copy all files from filesDir to deployDir
    await this.copyDirectory(filesDir, deployDir);
    ctx.logger.info(`[Fly.io] Files copied to deployment directory`);
    
    return deployDir;
  }

  private async buildAndPushImage(
    ctx: AdapterContext,
    config: any,
    appName: string,
    deployDir: string,
  ): Promise<string> {
    const { accessToken } = config;

    ctx.logger.info('[Fly.io] Building Docker image with remote builder...');

    // Create tarball of the deployment directory
    const tarPath = join(deployDir, 'source.tar.gz');
    await this.createTarball(deployDir, tarPath);

    // Upload to Fly's remote builder
    const formData = new FormData();
    formData.append('file', createReadStream(tarPath), {
      filename: 'source.tar.gz',
      contentType: 'application/gzip',
    });

    const buildResponse = await fetch(
      `https://api.fly.io/v1/apps/${appName}/builds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      },
    );

    if (!buildResponse.ok) {
      const error = await buildResponse.text();
      throw new Error(`Failed to start build: ${buildResponse.status} ${error}`);
    }

    const buildData: any = await buildResponse.json();
    const buildId = buildData.id;

    ctx.logger.info(`[Fly.io] Build started: ${buildId}`);

    // Wait for build to complete
    await this.waitForBuild(ctx, accessToken, appName, buildId);

    // Return the image name
    return buildData.image || `registry.fly.io/${appName}:${buildId}`;
  }

  private async deployMachine(ctx: AdapterContext, config: any, appName: string, imageName: string): Promise<any> {
    const { accessToken } = config;

    ctx.logger.info('[Fly.io] Creating machine...');

    const machineConfig = {
      name: `machine-${Date.now()}`,
      config: {
        image: imageName,
        services: [
          {
            ports: [
              {
                port: 80,
                handlers: ['http'],
              },
              {
                port: 443,
                handlers: ['tls', 'http'],
              },
            ],
            protocol: 'tcp',
            internal_port: 8080,
          },
        ],
        env: {
          ENVIRONMENT: 'production',
        },
      },
    };

    const machine = await this.flyApi(ctx, accessToken, 'POST', `/apps/${appName}/machines`, machineConfig);
    
    ctx.logger.info(`[Fly.io] Machine created: ${machine.id}`);
    
    // Wait for machine to be ready
    await this.waitForMachine(ctx, accessToken, appName, machine.id);
    
    return machine;
  }

  private async waitForBuild(
    ctx: AdapterContext,
    token: string,
    appName: string,
    buildId: string,
  ): Promise<void> {
    ctx.logger.info('[Fly.io] Waiting for build to complete...');
    
    const maxAttempts = 60; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `https://api.fly.io/v1/apps/${appName}/builds/${buildId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const build: any = await response.json();
          
          if (build.status === 'completed' || build.status === 'success') {
            ctx.logger.info('[Fly.io] Build completed successfully');
            return;
          }
          
          if (build.status === 'failed') {
            throw new Error('Build failed');
          }
          
          ctx.logger.debug(`[Fly.io] Build status: ${build.status}`);
        }
      } catch (error: any) {
        if (error.message === 'Build failed') {
          throw error;
        }
        // Continue waiting for other errors
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }

    throw new Error('Build timed out after 10 minutes');
  }

  private async copyDirectory(source: string, destination: string): Promise<void> {
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(source, entry.name);
      const destPath = join(destination, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories, node_modules, and fly-deploy temp dirs
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.startsWith('fly-deploy-')) {
          continue;
        }
        await mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        // Skip hidden files, Dockerfile, fly.toml, and tarballs (unless .well-known)
        if (
          entry.name === 'Dockerfile' ||
          entry.name === 'fly.toml' ||
          entry.name.endsWith('.tar.gz') ||
          (entry.name.startsWith('.') && entry.name !== '.well-known')
        ) {
          continue;
        }
        const content = await readFile(srcPath);
        await writeFile(destPath, content);
      }
    }
  }

  private async createTarball(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', [
        '-czf',
        outputPath,
        '--exclude=*.tar.gz',
        '-C',
        sourceDir,
        '.',
      ]);

      let stderr = '';
      tar.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tar.on('error', (error) => reject(error));
      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private async waitForMachine(ctx: AdapterContext, token: string, appName: string, machineId: string): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const machine = await this.flyApi(ctx, token, 'GET', `/apps/${appName}/machines/${machineId}`);
        
        if (machine.state === 'started') {
          return;
        }
        
        if (machine.state === 'failed') {
          throw new Error('Machine failed to start');
        }
      } catch (error) {
        // Machine not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Machine failed to start within timeout');
  }

  private async listMachines(ctx: AdapterContext, config: any, appName: string): Promise<any[]> {
    const { accessToken } = config;
    
    try {
      return await this.flyApi(ctx, accessToken, 'GET', `/apps/${appName}/machines`);
    } catch (error) {
      return [];
    }
  }

  private async stopMachine(ctx: AdapterContext, config: any, appName: string, machineId: string): Promise<void> {
    const { accessToken } = config;
    await this.flyApi(ctx, accessToken, 'POST', `/apps/${appName}/machines/${machineId}/stop`, {});
  }

  private async startMachine(ctx: AdapterContext, config: any, appName: string, machineId: string): Promise<void> {
    const { accessToken } = config;
    await this.flyApi(ctx, accessToken, 'POST', `/apps/${appName}/machines/${machineId}/start`, {});
  }

  private async updateMachineLabels(
    ctx: AdapterContext,
    config: any,
    appName: string,
    machineId: string,
    labels: Record<string, string>,
  ): Promise<void> {
    const { accessToken } = config;

    try {
      const machine = await this.flyApi(ctx, accessToken, 'GET', `/apps/${appName}/machines/${machineId}`);
      
      await this.flyApi(ctx, accessToken, 'POST', `/apps/${appName}/machines/${machineId}`, {
        config: {
          ...machine.config,
          metadata: {
            ...machine.config.metadata,
            ...labels,
          },
        },
      });
    } catch (error: any) {
      ctx.logger.warn(`[Fly.io] Could not update labels: ${error.message}`);
    }
  }
}
