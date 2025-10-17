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
import { toVercelConfig, parseDropJson } from './mappers/dropjson-to-platform.js';

/**
 * Vercel adapter for deploying to Vercel platform
 * Supports preview and production deployments with promotion
 */
export class VercelAdapter implements DeployAdapter {
  name = 'vercel';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.token || typeof c.token !== 'string') {
      return { valid: false, reason: 'token is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site, target: requestedTarget } = input;
    const target = requestedTarget === 'production' ? 'production' : 'staging';

    ctx.logger.info('[Vercel] Starting deployment...');
    ctx.logger.info(`[Vercel] Requested target: ${requestedTarget || 'preview'} -> using Vercel target "${target}"`);

    // Parse _drop.json and generate vercel.json if needed
    const dropConfig = await parseDropJson(filesDir);
    const vercelConfig = toVercelConfig(dropConfig);

    // Inject vercel.json if we have config
    if (Object.keys(vercelConfig).length > 0) {
      const vercelJsonPath = join(filesDir, 'vercel.json');
      await writeFile(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
      ctx.logger.info('[Vercel] Generated vercel.json from _drop.json');
    }

    // Collect all files and prepare payload for Vercel
    const files = await this.collectFiles(filesDir);
    ctx.logger.info(`[Vercel] Collected ${files.length} files`);

    // Build deployment payload with base64-encoded content
    const deploymentFiles: Array<{
      file: string;
      data: string;
      encoding: 'base64';
    }> = [];

    for (const file of files) {
      const content = await readFile(file.fullPath);

      deploymentFiles.push({
        file: file.relativePath,
        data: content.toString('base64'),
        encoding: 'base64',
      });
    }

    // Determine project name
    const projectName = config.projectName || site.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Ensure project exists (or create it)
    let projectId = config.projectId;
    if (!projectId) {
      projectId = await this.ensureProject(ctx, config, projectName);
    }

    // Create deployment
    const deployment = await this.createDeployment(
      ctx,
      config,
      projectName,
      deploymentFiles,
      target,
    );

    ctx.logger.info(`[Vercel] Deployment created: ${deployment.id}`);
    ctx.logger.info(`[Vercel] Preview URL: ${deployment.url}`);

    return {
      destinationRef: deployment.url,
      platformDeploymentId: deployment.id,
      previewUrl: `https://${deployment.url}`,
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
      ctx.logger.info(`[Vercel] Promoting deployment ${platformDeploymentId} to production`);
      await this.promoteToProduction(ctx, config, platformDeploymentId);
      ctx.logger.info('[Vercel] Deployment promoted to production');
    } else {
      ctx.logger.info('[Vercel] Preview deployment already active');
    }
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput & { platformDeploymentId?: string },
  ): Promise<void> {
    const config = input.config as any;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error('platformDeploymentId is required for Vercel rollback');
    }

    ctx.logger.info(`[Vercel] Rolling back to deployment ${platformDeploymentId}`);
    await this.promoteToProduction(ctx, config, platformDeploymentId);
    ctx.logger.info('[Vercel] Rollback complete');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    const projectId = c.projectId;

    if (!projectId) {
      return [];
    }

    const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=20`;
    const headers = this.getHeaders(c);

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const deployments = data.deployments || [];

      return deployments.map((d: any) => ({
        deployId: d.uid,
        active: d.target === 'production',
        createdAt: new Date(d.created).toISOString(),
      }));
    } catch (error) {
      ctx.logger.error(`[Vercel] Failed to list releases: ${error}`);
      return [];
    }
  }

  private async ensureProject(
    ctx: AdapterContext,
    config: any,
    projectName: string,
  ): Promise<string> {
    ctx.logger.info(`[Vercel] Ensuring project exists: ${projectName}`);

    // First, try to get existing project
    const listUrl = `https://api.vercel.com/v9/projects/${projectName}`;
    const headers = this.getHeaders(config);

    try {
      const response = await fetch(listUrl, { headers });

      if (response.ok) {
        const project: any = await response.json();
        ctx.logger.info(`[Vercel] Found existing project: ${project.id}`);
        return project.id;
      }
    } catch (error) {
      // Project doesn't exist, will create it
    }

    // Create new project
    ctx.logger.info(`[Vercel] Creating new project: ${projectName}`);
    const createUrl = 'https://api.vercel.com/v9/projects';

    const body: any = {
      name: projectName,
      framework: config.framework || 'static',
    };

    if (config.teamId) {
      body.teamId = config.teamId;
    }

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create Vercel project: ${createResponse.status} ${error}`);
    }

    const project: any = await createResponse.json();
    ctx.logger.info(`[Vercel] Created project: ${project.id}`);

    return project.id;
  }

  private async createDeployment(
    ctx: AdapterContext,
    config: any,
    projectName: string,
    deploymentFiles: Array<{
      file: string;
      data: string;
      encoding: 'base64';
    }>,
    target: 'production' | 'staging',
  ): Promise<{ id: string; url: string }> {
    const headers = this.getHeaders(config);

    ctx.logger.info('[Vercel] Preparing files for deployment...');
    ctx.logger.info(`[Vercel] Prepared ${deploymentFiles.length} files for upload`);
    ctx.logger.info(
      `[Vercel] Files payload type: ${Array.isArray(deploymentFiles) ? 'array' : typeof deploymentFiles}`,
    );
    if (deploymentFiles.length > 0) {
      const sample = deploymentFiles[0];
      ctx.logger.info(
        `[Vercel] Sample file payload keys: ${Object.keys(sample).join(', ')}`,
      );
      ctx.logger.info(
        `[Vercel] Sample file payload values: file=${sample.file}, encoding=${sample.encoding}, dataLength=${sample.data.length}`,
      );
    }

    // Step 2: Create deployment
    ctx.logger.info('[Vercel] Creating deployment...');

    const deployUrl = `https://api.vercel.com/v13/deployments`;

    const deploymentBody: any = {
      name: projectName,
      target,
      files: deploymentFiles,
    };

    if (config.teamId) {
      deploymentBody.teamId = config.teamId;
    }

    if (config.projectId || projectName) {
      deploymentBody.project = config.projectId || projectName;
    }

    const requestPreview = {
      name: deploymentBody.name,
      target: deploymentBody.target,
      project: deploymentBody.project,
      teamId: deploymentBody.teamId,
      fileCount: deploymentFiles.length,
      exampleFile: deploymentFiles[0]
        ? {
            file: deploymentFiles[0].file,
            encoding: deploymentFiles[0].encoding,
            dataLength: deploymentFiles[0].data.length,
          }
        : undefined,
    };
    ctx.logger.info(`[Vercel] Deployment body preview: ${JSON.stringify(requestPreview)}`);

    const deployResponse = await fetch(deployUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentBody),
    });

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to create Vercel deployment: ${deployResponse.status} ${error}`);
    }

    const deployment: any = await deployResponse.json();

    return {
      id: deployment.id || deployment.uid,
      url: deployment.url,
    };
  }

  private async promoteToProduction(
    ctx: AdapterContext,
    config: any,
    deploymentId: string,
  ): Promise<void> {
    const url = `https://api.vercel.com/v13/deployments/${deploymentId}/promote`;
    const headers = this.getHeaders(config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to promote Vercel deployment: ${response.status} ${error}`);
    }
  }

  private getHeaders(config: any): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
    };

    if (config.teamId) {
      headers['x-vercel-team-id'] = config.teamId;
    }

    return headers;
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

  async delete(
    ctx: AdapterContext,
    input: {
      deployId: string;
      config: unknown;
      site: { id: string; name: string };
      platformDeploymentId?: string;
    },
  ): Promise<void> {
    const config = input.config as any;
    const { platformDeploymentId } = input;

    if (!platformDeploymentId) {
      ctx.logger.warn('[Vercel] No platform deployment ID provided, skipping Vercel cleanup');
      return;
    }

    ctx.logger.info(`[Vercel] Deleting deployment ${platformDeploymentId}...`);

    const headers = this.getHeaders(config);
    const deleteUrl = `https://api.vercel.com/v13/deployments/${platformDeploymentId}`;

    try {
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        ctx.logger.warn(`[Vercel] Failed to delete deployment: ${response.status} ${error}`);
        // Don't throw error - we still want to delete the release record
      } else {
        ctx.logger.info(`[Vercel] Successfully deleted deployment ${platformDeploymentId}`);
      }
    } catch (error) {
      ctx.logger.warn(`[Vercel] Error deleting deployment: ${error}`);
      // Don't throw error - we still want to delete the release record
    }
  }
}
