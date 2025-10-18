import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ReleaseInfo,
  ValidationResult,
} from './types.js';

interface RenderConfig {
  token: string;
  staticSiteId?: string;
  serviceId?: string;
  branch?: string;
}

/**
 * Render adapter for deploying static sites and web services
 *
 * Supports:
 *  • Static Sites via direct artifact upload
 *  • Web Services via deploy trigger (uses repo/blueprint configured on Render)
 */
export class RenderAdapter implements DeployAdapter {
  name = 'render';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as Partial<RenderConfig>;

    if (!c.token || typeof c.token !== 'string') {
      return { valid: false, reason: 'token is required' };
    }

    if ((!c.staticSiteId || typeof c.staticSiteId !== 'string') &&
        (!c.serviceId || typeof c.serviceId !== 'string')) {
      return { valid: false, reason: 'Provide staticSiteId (for static sites) or serviceId (for web services)' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    const config = input.config as RenderConfig;
    const { deployId, filesDir } = input;

    ctx.logger.info('[Render] Starting deployment...');

    if (config.staticSiteId) {
      return this.deployStaticSite(ctx, config, filesDir, deployId);
    }

    if (config.serviceId) {
      return this.triggerServiceDeploy(ctx, config, deployId);
    }

    throw new Error('Render adapter misconfiguration: missing staticSiteId or serviceId');
  }

  async activate(
    ctx: AdapterContext,
    _input: ActivateInput,
  ): Promise<void> {
    // Render deploys go live automatically once the deploy succeeds.
    ctx.logger.info('[Render] Activation not required - deployment becomes live automatically.');
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput,
  ): Promise<void> {
    const config = input.config as RenderConfig;
    const deploymentId = input.platformDeploymentId;

    if (!deploymentId) {
      throw new Error('Render rollback requires platformDeploymentId');
    }

    ctx.logger.info(`[Render] Rolling back to deployment ${deploymentId}...`);

    const response = await fetch(`https://api.render.com/v1/deploys/${deploymentId}/rollback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Render rollback failed: ${response.status} ${response.statusText} ${errorText}`.trim());
    }

    ctx.logger.info('[Render] Rollback request submitted');
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as RenderConfig;

    const endpoint = c.staticSiteId
      ? `https://api.render.com/v1/static-sites/${c.staticSiteId}/deploys`
      : c.serviceId
        ? `https://api.render.com/v1/services/${c.serviceId}/deploys`
        : null;

    if (!endpoint) {
      return [];
    }

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${c.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data: any = await response.json().catch(() => ({}));
      const items: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.deploys)
          ? data.deploys
          : Array.isArray(data.items)
            ? data.items
            : [];

      return items.map((item: any) => ({
        id: item.id || item.deployId || item.serviceDeployId || 'unknown',
        timestamp: this.parseDate(item.createdAt || item.created_at || item.updatedAt || Date.now()),
        status: this.mapStatus(item.status || item.state || item.phase),
      }));
    } catch (error: any) {
      ctx.logger.error(`[Render] Failed to list releases: ${error.message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async deployStaticSite(
    ctx: AdapterContext,
    config: RenderConfig,
    filesDir: string,
    deployId: string,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    ctx.logger.info('[Render] Preparing static site artifact...');

    const { tarPath, tempDir } = await this.createTarball(filesDir);

    try {
      ctx.logger.info('[Render] Requesting upload slot...');
      const initResponse = await fetch(
        `https://api.render.com/v1/static-sites/${config.staticSiteId}/deploys`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commitId: deployId,
            commitMessage: `Deploy ${deployId}`,
          }),
        },
      );

      if (!initResponse.ok) {
        const text = await initResponse.text().catch(() => '');
        throw new Error(`Render deploy init failed: ${initResponse.status} ${initResponse.statusText} ${text}`.trim());
      }

      const initData: any = await initResponse.json().catch(() => ({}));
      const uploadUrl = initData.uploadURL || initData.uploadUrl || initData.archiveUploadUrl;

      if (!uploadUrl) {
        throw new Error('Render deploy init response missing upload URL');
      }

      ctx.logger.info('[Render] Uploading artifact to Render...');
      const archiveBuffer = await readFile(tarPath);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Length': String(archiveBuffer.length),
        },
        body: archiveBuffer,
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text().catch(() => '');
        throw new Error(`Render artifact upload failed: ${uploadResponse.status} ${uploadResponse.statusText} ${text}`.trim());
      }

      ctx.logger.info('[Render] Artifact uploaded successfully');

      const platformDeploymentId = initData.id || initData.deployId || initData.deploy?.id;
      const previewUrl = initData.deploy?.previewUrl || initData.previewURL || initData.previewUrl;

      return {
        destinationRef: `render://${config.staticSiteId}/${platformDeploymentId || deployId}`,
        platformDeploymentId: platformDeploymentId || undefined,
        previewUrl: previewUrl || undefined,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async triggerServiceDeploy(
    ctx: AdapterContext,
    config: RenderConfig,
    deployId: string,
  ): Promise<{ destinationRef?: string; platformDeploymentId?: string; previewUrl?: string }> {
    ctx.logger.info('[Render] Triggering web service deployment...');

    const payload: Record<string, any> = {
      clearCache: true,
      commitMessage: `Deploy ${deployId}`,
    };

    if (config.branch) {
      payload.branch = config.branch;
    }

    const response = await fetch(
      `https://api.render.com/v1/services/${config.serviceId}/deploys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Render deploy trigger failed: ${response.status} ${response.statusText} ${text}`.trim());
    }

    const data: any = await response.json().catch(() => ({}));

    ctx.logger.info('[Render] Deploy triggered');

    return {
      destinationRef: `render://${config.serviceId}/${data.id || deployId}`,
      platformDeploymentId: data.id || undefined,
      previewUrl: data.deploy?.url || data.url || undefined,
    };
  }

  private async createTarball(sourceDir: string): Promise<{ tarPath: string; tempDir: string }> {
    const tempDir = await mkdtemp(join(tmpdir(), 'render-'));
    const tarPath = join(tempDir, 'artifact.tar.gz');

    await new Promise<void>((resolve, reject) => {
      const tar = spawn('tar', ['-czf', tarPath, '-C', sourceDir, '.']);

      tar.on('error', (error) => reject(error));
      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar exited with code ${code}`));
        }
      });
    });

    return { tarPath, tempDir };
  }

  private parseDate(value: any): string {
    try {
      const date = value ? new Date(value) : new Date();
      if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private mapStatus(status: string): 'active' | 'staged' | 'failed' {
    const normalized = (status || '').toLowerCase();

    if (['live', 'success', 'succeeded', 'ready', 'completed', 'active'].includes(normalized)) {
      return 'active';
    }

    if (['failed', 'error', 'cancelled', 'canceled'].includes(normalized)) {
      return 'failed';
    }

    return 'staged';
  }
}
