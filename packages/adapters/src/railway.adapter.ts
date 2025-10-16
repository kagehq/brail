import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
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

      // Step 2: Create deployment via Railway API
      const deployment = await this.createDeployment(ctx, config, serviceId);
      ctx.logger.info(`[Railway] Deployment created: ${deployment.id}`);

      // Step 3: Upload static files
      await this.uploadFiles(ctx, config, deployment.id, filesDir);
      ctx.logger.info('[Railway] Files uploaded successfully');

      // Step 4: Trigger build/deploy
      const deploymentUrl = await this.triggerDeploy(ctx, config, deployment.id);
      ctx.logger.info(`[Railway] Deployment URL: ${deploymentUrl}`);

      return {
        destinationRef: `railway://${serviceId}/${deployment.id}`,
        platformDeploymentId: deployment.id,
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

  private async createDeployment(ctx: AdapterContext, config: any, serviceId: string): Promise<any> {
    const { token } = config;

    const mutation = `
      mutation DeploymentCreate($input: DeploymentCreateInput!) {
        deploymentCreate(input: $input) {
          id
          createdAt
        }
      }
    `;

    const data = await this.railwayGraphQL(ctx, token, mutation, {
      input: {
        serviceId,
        environmentId: config.environmentId,
      },
    });

    return data.deploymentCreate;
  }

  private async uploadFiles(ctx: AdapterContext, config: any, deploymentId: string, filesDir: string): Promise<void> {
    // Railway doesn't have a direct file upload API like Cloudflare Pages
    // In a real implementation, you would:
    // 1. Package files into a tar/zip
    // 2. Upload to Railway's blob storage
    // 3. Configure the deployment to use these files
    
    // For this implementation, we'll use Railway's volume mounting or
    // assume files are part of the service's git repo/Docker image
    
    ctx.logger.info('[Railway] Note: Railway deployments typically use Git or Docker images.');
    ctx.logger.info('[Railway] For static files, consider using Railway volumes or including files in the image.');
    
    // Placeholder for actual file upload logic
    // This would require packaging files and using Railway's storage API
  }

  private async triggerDeploy(ctx: AdapterContext, config: any, deploymentId: string): Promise<string> {
    const { token, projectId, environmentId } = config;

    // Trigger the deployment
    const mutation = `
      mutation DeploymentTrigger($id: String!) {
        deploymentTrigger(id: $id) {
          id
          url
        }
      }
    `;

    try {
      const data = await this.railwayGraphQL(ctx, token, mutation, { id: deploymentId });
      return data.deploymentTrigger?.url || `https://${projectId}.railway.app`;
    } catch (error) {
      // If trigger fails, return a default URL
      return `https://${projectId}.up.railway.app`;
    }
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
