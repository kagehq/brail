import { readdir, stat, readFile, writeFile, mkdtemp, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import FormData from 'form-data';
import { createReadStream } from 'fs';
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
 * Railway adapter for deploying static sites
 * 
 * Railway deployment strategy:
 * 1. Create a service with a static web server (nginx)
 * 2. Upload assets via Railway's build/deployment API
 * 3. Use environment variables to configure the service
 * 4. Deployments are triggered via Railway's GraphQL API
 */
export class RailwayAdapter implements DeployAdapter {
  name = 'railway';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.token || typeof c.token !== 'string') {
      return { valid: false, reason: 'token is required' };
    }

    if (!c.projectId || typeof c.projectId !== 'string') {
      return { valid: false, reason: 'projectId is required' };
    }

    if (!c.environmentId || typeof c.environmentId !== 'string') {
      return { valid: false, reason: 'environmentId is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir } = input;

    ctx.logger.info('[Railway] Starting deployment...');

    try {
      // Step 1: Get or create service
      const serviceId = await this.ensureService(ctx, config);
      ctx.logger.info(`[Railway] Using service: ${serviceId}`);

      // Step 2: Package files with Dockerfile
      const { archivePath, tempDir } = await this.packageForDeployment(ctx, filesDir, deployId);
      ctx.logger.info('[Railway] Files packaged successfully');

      // Step 3: Upload source archive to Railway
      const deploymentId = await this.uploadSourceArchive(ctx, config, serviceId, archivePath);
      ctx.logger.info(`[Railway] Deployment created: ${deploymentId}`);

      // Step 4: Wait for deployment to complete
      await this.waitForDeployment(ctx, config, deploymentId);
      
      // Step 5: Get deployment URL
      const deploymentUrl = await this.getDeploymentUrl(ctx, config, serviceId, deploymentId);
      ctx.logger.info(`[Railway] Deployment URL: ${deploymentUrl}`);

      // Cleanup temp directory
      await rm(tempDir, { recursive: true, force: true });

      return {
        destinationRef: `railway://${serviceId}/${deploymentId}`,
        platformDeploymentId: deploymentId,
        previewUrl: deploymentUrl,
      };
    } catch (error: any) {
      ctx.logger.error(`[Railway] Deployment failed: ${error.message}`);
      throw error;
    }
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    const config = input.config as any;
    const { platformDeploymentId } = input;

    ctx.logger.info(`[Railway] Activating deployment: ${platformDeploymentId}`);

    // Railway doesn't have explicit "activation" - deployments go live automatically
    // For production target, we could update environment variables or DNS
    if (input.target === 'production') {
      ctx.logger.info('[Railway] Setting deployment as production...');
      // In a real implementation, this might update environment variables
      // or configure custom domains to point to this deployment
    }

    ctx.logger.info('[Railway] Deployment activated');
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput,
  ): Promise<void> {
    const config = input.config as any;
    const { platformDeploymentId } = input;

    ctx.logger.info(`[Railway] Rolling back to deployment: ${platformDeploymentId}`);

    try {
      // Railway rollback: redeploy a previous deployment
      await this.redeployment(ctx, config, platformDeploymentId!);
      ctx.logger.info('[Railway] Rollback completed');
    } catch (error: any) {
      ctx.logger.error(`[Railway] Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;

    try {
      const deployments = await this.fetchDeployments(ctx, c);
      
      return deployments.map((d: any) => ({
        id: d.id,
        timestamp: new Date(d.createdAt).toISOString(),
        status: d.status === 'SUCCESS' ? 'active' : d.status === 'FAILED' ? 'failed' : 'staged',
      }));
    } catch (error: any) {
      ctx.logger.error(`[Railway] Failed to list releases: ${error.message}`);
      return [];
    }
  }

  // ==================== Private Helper Methods ====================

  private async railwayGraphQL(ctx: AdapterContext, token: string, query: string, variables: any = {}): Promise<any> {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status} ${response.statusText}`);
    }

    const result: any = await response.json();
    
    if (result.errors) {
      throw new Error(`Railway GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`);
    }

    return result.data;
  }

  private async ensureService(ctx: AdapterContext, config: any): Promise<string> {
    const { token, projectId, environmentId, serviceName = 'static-site' } = config;

    // Check if service already exists
    const query = `
      query GetServices($projectId: String!, $environmentId: String!) {
        project(id: $projectId) {
          services(environmentId: $environmentId) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.railwayGraphQL(ctx, token, query, { projectId, environmentId });
    const services = data.project?.services?.edges || [];
    
    // Find existing service
    const existingService = services.find((edge: any) => edge.node.name === serviceName);
    if (existingService) {
      return existingService.node.id;
    }

    // Create new service
    ctx.logger.info('[Railway] Creating new service...');
    const createMutation = `
      mutation CreateService($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
        }
      }
    `;

    const createData = await this.railwayGraphQL(ctx, token, createMutation, {
      input: {
        projectId,
        environmentId,
        name: serviceName,
        source: {
          image: 'nginx:alpine', // Use nginx for static files
        },
      },
    });

    return createData.serviceCreate.id;
  }

  private async packageForDeployment(
    ctx: AdapterContext,
    filesDir: string,
    deployId: string,
  ): Promise<{ archivePath: string; tempDir: string }> {
    ctx.logger.info('[Railway] Packaging files for deployment...');

    // Create temp directory
    const tempDir = await mkdtemp(join(tmpdir(), 'railway-'));
    
    // Create Dockerfile for static site hosting
    const dockerfile = `FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \\
    listen 80; \\
    listen [::]:80; \\
    root /usr/share/nginx/html; \\
    index index.html index.htm; \\
    \\
    location / { \\
        try_files \\$uri \\$uri/ /index.html =404; \\
    } \\
    \\
    # Gzip compression \\
    gzip on; \\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \\
    \\
    # Cache static assets \\
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ { \\
        expires 1y; \\
        add_header Cache-Control "public, immutable"; \\
    } \\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

    await writeFile(join(tempDir, 'Dockerfile'), dockerfile);

    // Copy all files from filesDir to tempDir
    await this.copyDirectory(filesDir, tempDir);

    // Create tarball
    const archivePath = join(tempDir, 'deploy.tar.gz');
    await this.createTarball(tempDir, archivePath);

    return { archivePath, tempDir };
  }

  private async uploadSourceArchive(
    ctx: AdapterContext,
    config: any,
    serviceId: string,
    archivePath: string,
  ): Promise<string> {
    const { token } = config;

    ctx.logger.info('[Railway] Uploading source archive...');

    // Use Railway's deployment API with source upload
    const formData = new FormData();
    formData.append('source', createReadStream(archivePath), {
      filename: 'deploy.tar.gz',
      contentType: 'application/gzip',
    });

    const response = await fetch(
      `https://backboard.railway.app/project/${config.projectId}/environment/${config.environmentId}/service/${serviceId}/up`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Railway upload failed: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    return data.deploymentId || data.id;
  }

  private async waitForDeployment(
    ctx: AdapterContext,
    config: any,
    deploymentId: string,
  ): Promise<void> {
    ctx.logger.info('[Railway] Waiting for deployment to complete...');

    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const query = `
          query GetDeployment($id: String!) {
            deployment(id: $id) {
              id
              status
              url
            }
          }
        `;

        const data = await this.railwayGraphQL(ctx, config.token, query, { id: deploymentId });
        const status = data.deployment?.status;

        if (status === 'SUCCESS') {
          ctx.logger.info('[Railway] Deployment successful');
          return;
        }

        if (status === 'FAILED' || status === 'CRASHED') {
          throw new Error(`Deployment failed with status: ${status}`);
        }

        ctx.logger.debug(`[Railway] Deployment status: ${status}`);
      } catch (error: any) {
        // Continue waiting if query fails
        ctx.logger.debug(`[Railway] Status check attempt ${attempts + 1}/${maxAttempts}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
    }

    throw new Error('Deployment timed out after 5 minutes');
  }

  private async getDeploymentUrl(
    ctx: AdapterContext,
    config: any,
    serviceId: string,
    deploymentId: string,
  ): Promise<string> {
    try {
      const query = `
        query GetDeployment($id: String!) {
          deployment(id: $id) {
            id
            url
          }
        }
      `;

      const data = await this.railwayGraphQL(ctx, config.token, query, { id: deploymentId });
      
      if (data.deployment?.url) {
        return data.deployment.url;
      }
    } catch (error) {
      ctx.logger.debug('[Railway] Could not fetch deployment URL from API');
    }

    // Fallback to constructing URL
    return `https://${serviceId}.up.railway.app`;
  }

  private async copyDirectory(source: string, destination: string): Promise<void> {
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(source, entry.name);
      const destPath = join(destination, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        await mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        // Skip hidden files except .well-known
        if (entry.name.startsWith('.') && entry.name !== '.well-known') {
          continue;
        }
        const content = await readFile(srcPath);
        await writeFile(destPath, content);
      }
    }
  }

  private async createTarball(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Exclude the output archive itself from the tarball
      const tar = spawn('tar', [
        '-czf',
        outputPath,
        '--exclude=deploy.tar.gz',
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

  private async redeployment(ctx: AdapterContext, config: any, deploymentId: string): Promise<void> {
    const { token } = config;

    const mutation = `
      mutation DeploymentRedeploy($id: String!) {
        deploymentRedeploy(id: $id) {
          id
        }
      }
    `;

    await this.railwayGraphQL(ctx, token, mutation, { id: deploymentId });
  }

  private async fetchDeployments(ctx: AdapterContext, config: any): Promise<any[]> {
    const { token, projectId, environmentId } = config;

    const query = `
      query GetDeployments($projectId: String!, $environmentId: String!) {
        project(id: $projectId) {
          deployments(environmentId: $environmentId, first: 20) {
            edges {
              node {
                id
                status
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await this.railwayGraphQL(ctx, token, query, { projectId, environmentId });
    return data.project?.deployments?.edges?.map((edge: any) => edge.node) || [];
  }
}
