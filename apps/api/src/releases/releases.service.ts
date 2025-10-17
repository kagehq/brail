import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AdapterRegistry } from '../adapters/adapter.registry';
import { ProfilesService } from '../profiles/profiles.service';
import { HealthService } from '../health/health.service';
import { EnvService } from '../env/env.service';
import { BuildLogsService } from '../build-logs/build-logs.service';
import type { AdapterContext } from '@br/adapters';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);
  
  // Adapter-compatible logger wrapper
  private get adapterLogger() {
    return {
      info: (...args: any[]) => this.logger.log(args.join(' ')),
      error: (...args: any[]) => this.logger.error(args.join(' ')),
      debug: (...args: any[]) => this.logger.debug(args.join(' ')),
      warn: (...args: any[]) => this.logger.warn(args.join(' ')),
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly profilesService: ProfilesService,
    private readonly healthService: HealthService,
    private readonly envService: EnvService,
    private readonly buildLogsService: BuildLogsService,
  ) {}

  /**
   * Stage a release by uploading to destination
   */
  async stageRelease(
    deployId: string,
    profileId?: string,
    adapterName?: string,
    config?: unknown,
    target: 'preview' | 'production' = 'preview',
  ) {
    // Get deploy
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: deployId },
      include: { site: true },
    });

    if (!deploy) {
      throw new NotFoundException('Deploy not found');
    }

    // Resolve adapter and config
    let adapter;
    let resolvedConfig;

    if (profileId) {
      const profile = await this.profilesService.getById(profileId);
      adapter = this.adapterRegistry.getAdapter(profile.adapter);
      resolvedConfig = await this.profilesService.getDecryptedConfig(profileId);
    } else if (adapterName && config) {
      adapter = this.adapterRegistry.getAdapter(adapterName);
      const validation = adapter.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid config: ${validation.reason}`);
      }
      resolvedConfig = config;
    } else {
      throw new Error('Must provide either profileId or adapter+config');
    }

    this.logger.log(
      `Staging deploy ${deployId} with adapter ${adapter.name}`,
    );

    // Download files from Phase-0 storage to temp directory
    const tmpDir = join(tmpdir(), `br-stage-${deployId}`);
    await mkdir(tmpDir, { recursive: true });

    try {
      // Download all files for this deploy
      await this.downloadDeployFiles(deployId, tmpDir);

      // Get environment variables for this deployment
      const runtimeScope = target === 'production' ? 'runtime:production' : 'runtime:preview';
      const adapterScope = `adapter:${adapter.name}`;
      
      // Fetch env vars for runtime and adapter-specific scopes
      const [runtimeEnvVars, adapterEnvVars] = await Promise.all([
        this.envService.exportForScope(deploy.siteId, runtimeScope).catch(() => ({})),
        this.envService.exportForScope(deploy.siteId, adapterScope).catch(() => ({})),
      ]);

      // Merge env vars (adapter-specific takes precedence)
      const envVars = { ...runtimeEnvVars, ...adapterEnvVars };

      this.logger.log(
        `Injecting ${Object.keys(envVars).length} environment variables for ${adapter.name} (${target})`,
      );

      // Create adapter context
      const ctx: AdapterContext = {
        logger: this.adapterLogger,
        tmpDir,
        env: envVars, // Inject env vars into adapter context
      } as any; // Cast to any since AdapterContext doesn't have env yet

      // Upload to destination
      const result = await adapter.upload(ctx, {
        deployId,
        filesDir: tmpDir,
        config: resolvedConfig,
        site: {
          id: deploy.siteId,
          name: deploy.site.name,
        },
        target,
      });

      // Create build log for the deployment
      const buildLog = await this.buildLogsService.create({
        siteId: deploy.siteId,
        deployId,
        framework: 'static',
        command: `deploy to ${adapter.name}`,
        status: 'success',
        exitCode: 0,
        stdout: `Successfully deployed to ${adapter.name}\nTarget: ${target}\nDestination: ${result.destinationRef || 'N/A'}\nPreview URL: ${(result as any).previewUrl || 'N/A'}`,
        stderr: '',
        duration: 0, // We don't track duration for now
        nodeVersion: process.version,
        packageManager: 'none',
        cacheHit: false,
        outputDir: tmpDir,
      });

      this.logger.log(`Created build log ${buildLog.id} for deployment ${deployId}`);

      // Create release record
      const release = await this.prisma.release.create({
        data: {
          siteId: deploy.siteId,
          deployId,
          adapter: adapter.name,
          destinationRef: result.destinationRef || null,
          platformDeploymentId: (result as any).platformDeploymentId || null,
          previewUrl: (result as any).previewUrl || null,
          target,
          status: 'staged',
        },
      });

      this.logger.log(`Staged release ${release.id} for deploy ${deployId} (target: ${target})`);

      return release;
    } finally {
      // Cleanup temp directory
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Activate a staged release
   */
  async activateRelease(
    deployId: string,
    profileId?: string,
    adapterName?: string,
    config?: unknown,
    target: 'preview' | 'production' = 'preview',
    comment?: string,
  ) {
    // Get deploy and site
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: deployId },
      include: { site: true },
    });

    if (!deploy) {
      throw new NotFoundException('Deploy not found');
    }

    // Resolve adapter and config
    let adapter;
    let resolvedConfig;

    if (profileId) {
      const profile = await this.profilesService.getById(profileId);
      adapter = this.adapterRegistry.getAdapter(profile.adapter);
      resolvedConfig = await this.profilesService.getDecryptedConfig(profileId);
    } else if (adapterName && config) {
      adapter = this.adapterRegistry.getAdapter(adapterName);
      resolvedConfig = config;
    } else {
      throw new Error('Must provide either profileId or adapter+config');
    }

    this.logger.log(
      `Activating deploy ${deployId} with adapter ${adapter.name}`,
    );

    // Health check if SSH with health config
    if (adapter.name === 'ssh-rsync' && resolvedConfig.health) {
      await this.performHealthCheck(resolvedConfig.health, deployId);
    }

    // Get release to access platform deployment ID
    const release = await this.prisma.release.findFirst({
      where: {
        deployId,
        adapter: adapter.name,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get environment variables for this deployment
    const runtimeScope = target === 'production' ? 'runtime:production' : 'runtime:preview';
    const adapterScope = `adapter:${adapter.name}`;
    
    // Fetch env vars for runtime and adapter-specific scopes
    const [runtimeEnvVars, adapterEnvVars] = await Promise.all([
      this.envService.exportForScope(deploy.siteId, runtimeScope).catch(() => ({})),
      this.envService.exportForScope(deploy.siteId, adapterScope).catch(() => ({})),
    ]);

    // Merge env vars (adapter-specific takes precedence)
    const envVars = { ...runtimeEnvVars, ...adapterEnvVars };

    this.logger.log(
      `Injecting ${Object.keys(envVars).length} environment variables for ${adapter.name} activation (${target})`,
    );

    // Create adapter context
    const ctx: AdapterContext = {
      logger: this.adapterLogger,
      env: envVars, // Inject env vars into adapter context
    } as any; // Cast to any since AdapterContext doesn't have env yet

    try {
      // Activate with target and platform deployment ID
      await adapter.activate(ctx, {
        deployId,
        config: resolvedConfig,
        site: {
          id: deploy.siteId,
          name: deploy.site.name,
        },
        target,
        platformDeploymentId: release?.platformDeploymentId,
      } as any);

      // Update release status
      await this.prisma.release.updateMany({
        where: {
          deployId,
          adapter: adapter.name,
        },
        data: {
          status: 'active',
        },
      });

      // Deactivate other releases
      await this.prisma.release.updateMany({
        where: {
          siteId: deploy.siteId,
          adapter: adapter.name,
          deployId: { not: deployId },
        },
        data: {
          status: 'staged',
        },
      });

      // Update deploy status, comment, and duration
      const duration = Date.now() - new Date(deploy.createdAt).getTime();
      await this.prisma.deploy.update({
        where: { id: deployId },
        data: {
          status: 'active',
          // Only update comment if provided, otherwise keep existing
          ...(comment !== undefined && { comment: comment || null }),
          duration,
        },
      });

      // Update site's active deploy
      await this.prisma.site.update({
        where: { id: deploy.siteId },
        data: { activeDeployId: deployId },
      });

      // Cleanup old releases
      if (adapter.cleanupOld) {
        const keepReleases = resolvedConfig.keepReleases || 5;
        await adapter.cleanupOld(ctx, resolvedConfig, keepReleases);
      }

      this.logger.log(`Activated deploy ${deployId}`);

      // Create build log for the activation
      await this.buildLogsService.create({
        siteId: deploy.siteId,
        deployId,
        framework: 'static',
        command: `activate on ${adapter.name}`,
        status: 'success',
        exitCode: 0,
        stdout: `Successfully activated deployment on ${adapter.name}\nTarget: ${target}\nPlatform Deployment ID: ${release?.platformDeploymentId || 'N/A'}`,
        stderr: '',
        duration: 0,
        nodeVersion: process.version,
        packageManager: 'none',
        cacheHit: false,
        outputDir: '',
      });

      return {
        success: true,
        deployId,
        adapter: adapter.name,
      };
    } catch (error) {
      // Mark release as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await this.prisma.release.updateMany({
        where: {
          deployId,
          adapter: adapter.name,
        },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      // Create build log for the failed activation
      await this.buildLogsService.create({
        siteId: deploy.siteId,
        deployId,
        framework: 'static',
        command: `activate on ${adapter.name}`,
        status: 'failed',
        exitCode: 1,
        stdout: '',
        stderr: errorMessage,
        duration: 0,
        nodeVersion: process.version,
        packageManager: 'none',
        cacheHit: false,
        outputDir: '',
      });

      throw error;
    }
  }

  /**
   * Rollback to a previous release
   */
  async rollbackRelease(
    siteId: string,
    toDeployId: string,
    profileId?: string,
    adapterName?: string,
    config?: unknown,
  ) {
    // Verify deploy exists
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: toDeployId },
      include: { site: true },
    });

    if (!deploy || deploy.siteId !== siteId) {
      throw new NotFoundException('Deploy not found');
    }

    // Resolve adapter and config
    let adapter;
    let resolvedConfig;

    if (profileId) {
      const profile = await this.profilesService.getById(profileId);
      adapter = this.adapterRegistry.getAdapter(profile.adapter);
      resolvedConfig = await this.profilesService.getDecryptedConfig(profileId);
    } else if (adapterName && config) {
      adapter = this.adapterRegistry.getAdapter(adapterName);
      resolvedConfig = config;
    } else {
      // Try to find release and use its adapter
      const release = await this.prisma.release.findFirst({
        where: { deployId: toDeployId },
        orderBy: { createdAt: 'desc' },
      });

      if (!release) {
        throw new Error('Release not found and no adapter specified');
      }

      adapter = this.adapterRegistry.getAdapter(release.adapter);

      // Try to use default profile
      try {
        const defaultProfile = await this.profilesService.getDefault(siteId);
        resolvedConfig = await this.profilesService.getDecryptedConfig(
          defaultProfile.id,
        );
      } catch {
        throw new Error('No config provided and no default profile found');
      }
    }

    this.logger.log(`Rolling back to deploy ${toDeployId}`);

    // Create adapter context
    const ctx: AdapterContext = {
      logger: this.adapterLogger,
    };

    // Get release to access platform deployment ID
    const release = await this.prisma.release.findFirst({
      where: {
        deployId: toDeployId,
        adapter: adapter.name,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Rollback
    await adapter.rollback(ctx, {
      toDeployId,
      config: resolvedConfig,
      site: {
        id: deploy.siteId,
        name: deploy.site.name,
      },
      platformDeploymentId: release?.platformDeploymentId,
    } as any);

    // Update release statuses
    await this.prisma.release.updateMany({
      where: {
        siteId,
        adapter: adapter.name,
        deployId: toDeployId,
      },
      data: {
        status: 'active',
      },
    });

    await this.prisma.release.updateMany({
      where: {
        siteId,
        adapter: adapter.name,
        deployId: { not: toDeployId },
      },
      data: {
        status: 'staged',
      },
    });

    // Update site's active deploy
    await this.prisma.site.update({
      where: { id: siteId },
      data: { activeDeployId: toDeployId },
    });

    this.logger.log(`Rolled back to deploy ${toDeployId}`);

    return {
      success: true,
      deployId: toDeployId,
    };
  }

  /**
   * List releases for a site
   */
  async listReleases(siteId: string) {
    const releases = await this.prisma.release.findMany({
      where: { siteId },
      include: {
        deploy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return releases;
  }

  /**
   * Delete a release
   */
  async deleteRelease(releaseId: string) {
    // Get the release with deploy and site info
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        deploy: {
          include: {
            site: true,
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    this.logger.log(`Deleting release ${releaseId} for deploy ${release.deployId}`);

    try {
      // Get adapter to clean up platform resources
      const adapter = this.adapterRegistry.getAdapter(release.adapter);
      
      // Create adapter context for cleanup
      const ctx: AdapterContext = {
        logger: this.adapterLogger,
      };

      // If the adapter has a delete method, use it to clean up platform resources
      if (adapter.delete) {
        try {
          await adapter.delete(ctx, {
            deployId: release.deployId,
            config: {}, // We don't have the original config here
            site: {
              id: release.deploy.siteId,
              name: release.deploy.site.name,
            },
            platformDeploymentId: release.platformDeploymentId || undefined,
          });
          this.logger.log(`Cleaned up platform resources for release ${releaseId}`);
        } catch (error) {
          this.logger.warn(`Failed to clean up platform resources for release ${releaseId}:`, error);
          // Continue with deletion even if cleanup fails
        }
      }

      // Delete the release from database
      await this.prisma.release.delete({
        where: { id: releaseId },
      });

      this.logger.log(`Deleted release ${releaseId}`);

      return {
        success: true,
        releaseId,
      };
    } catch (error) {
      this.logger.error(`Failed to delete release ${releaseId}:`, error);
      throw error;
    }
  }

  /**
   * Download deploy files from Phase-0 storage
   */
  private async downloadDeployFiles(deployId: string, targetDir: string) {
    const prefix = `deploys/${deployId}/`;
    const objects = await this.storage.listPrefix(prefix);

    this.logger.log(`Downloading ${objects.length} files for deploy ${deployId}`);

    for (const obj of objects) {
      const relativePath = obj.key.replace(prefix, '');
      const targetPath = join(targetDir, relativePath);

      // Create directory if needed
      const dir = join(targetPath, '..');
      await mkdir(dir, { recursive: true });

      // Download file
      const stream = await this.storage.getObjectStream(obj.key);
      const { writeFile } = await import('fs/promises');
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }

      await writeFile(targetPath, Buffer.concat(chunks));
    }

    this.logger.log(`Downloaded ${objects.length} files to ${targetDir}`);
  }

  /**
   * Perform health check before activation
   */
  private async performHealthCheck(healthConfig: any, deployId: string) {
    if (healthConfig.mode === 'url' && healthConfig.url) {
      await this.healthService.checkUrl(healthConfig.url, {
        timeoutMs: healthConfig.timeoutMs,
        retries: healthConfig.retries,
      });
    } else if (healthConfig.mode === 'canary' && healthConfig.canaryPath) {
      await this.healthService.checkCanary(
        healthConfig.canaryPath,
        deployId,
        {
          timeoutMs: healthConfig.timeoutMs,
          retries: healthConfig.retries,
        },
      );
    }
  }
}
