import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';
import { createHash } from 'crypto';
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
    const { deployId, filesDir, site } = input;

    ctx.logger.info('[Vercel] Starting deployment...');

    // Parse _drop.json and generate vercel.json if needed
    const dropConfig = await parseDropJson(filesDir);
    const vercelConfig = toVercelConfig(dropConfig);

    // Inject vercel.json if we have config
    if (Object.keys(vercelConfig).length > 0) {
      const vercelJsonPath = join(filesDir, 'vercel.json');
      await writeFile(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
      ctx.logger.info('[Vercel] Generated vercel.json from _drop.json');
    }

    // Collect all files and compute hashes
    const files = await this.collectFiles(filesDir);
    ctx.logger.info(`[Vercel] Collected ${files.length} files`);

    // Create file map with SHA256 hashes
    const fileMap: Record<string, string> = {};
    for (const file of files) {
      const content = await readFile(file.fullPath);
      const hash = createHash('sha256').update(content).digest('hex');
      fileMap[file.relativePath] = hash;
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
      files,
      fileMap,
      filesDir,
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
    files: Array<{ fullPath: string; relativePath: string }>,
    fileMap: Record<string, string>,
    filesDir: string,
  ): Promise<{ id: string; url: string }> {
    const headers = this.getHeaders(config);

    // Step 1: Upload files that don't exist on Vercel
    ctx.logger.info('[Vercel] Uploading files...');

    for (const file of files) {
      const hash = fileMap[file.relativePath];
      const content = await readFile(file.fullPath);

      // Upload file
      const uploadUrl = `https://api.vercel.com/v2/now/files`;
      const uploadHeaders = {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': hash,
      };

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: uploadHeaders,
        body: content,
      });

      if (!uploadResponse.ok && uploadResponse.status !== 409) {
        // 409 means file already exists, which is OK
        throw new Error(`Failed to upload file ${file.relativePath}: ${uploadResponse.status}`);
      }
    }

    ctx.logger.info('[Vercel] Files uploaded');

    // Step 2: Create deployment
    ctx.logger.info('[Vercel] Creating deployment...');

    const deployUrl = 'https://api.vercel.com/v13/deployments';
    
    const deploymentBody: any = {
      name: projectName,
      files: files.map((file) => ({
        file: file.relativePath,
        sha: fileMap[file.relativePath],
        size: 0, // Vercel doesn't strictly require this
      })),
      projectSettings: {
        framework: config.framework || null,
      },
      target: 'preview', // Always create as preview first
    };

    if (config.teamId) {
      deploymentBody.teamId = config.teamId;
    }

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
}

