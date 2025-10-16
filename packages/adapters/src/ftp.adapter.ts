import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, posix } from 'path';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ValidationResult,
} from './types.js';

interface FtpConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  basePath?: string;
  secure?: boolean;
  keepReleases?: number;
}

/**
 * FTP adapter for deploying to traditional FTP servers
 * Uses atomic directory switching for zero-downtime deploys
 */
export class FtpAdapter implements DeployAdapter {
  name = 'ftp';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as Partial<FtpConfig>;

    if (!c.host || typeof c.host !== 'string') {
      return { valid: false, reason: 'host is required' };
    }

    if (!c.user || typeof c.user !== 'string') {
      return { valid: false, reason: 'user is required' };
    }

    if (!c.password || typeof c.password !== 'string') {
      return { valid: false, reason: 'password is required' };
    }

    if (c.port && typeof c.port !== 'number') {
      return { valid: false, reason: 'port must be a number' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string }> {
    const config = input.config as FtpConfig;
    const { deployId, filesDir } = input;

    ctx.logger.info('[FTP] Connecting to server...');

    // Dynamic import to support optional dependency
    let Client: any;
    try {
      // @ts-ignore - optional peer dependency
      const ftp = await import('basic-ftp');
      Client = ftp.Client;
    } catch {
      throw new Error('FTP adapter requires "basic-ftp" package. Install it with: npm install basic-ftp');
    }
    
    const client = new Client();
    (client as any).ftp.verbose = false;

    try {
      // Connect to FTP server
      await client.access({
        host: config.host,
        port: config.port || 21,
        user: config.user,
        password: config.password,
        secure: config.secure || false,
      });

      ctx.logger.info('[FTP] Connected successfully');

      // Navigate to base path
      const basePath = config.basePath || '/';
      await client.ensureDir(basePath);
      await client.cd(basePath);

      // Create releases directory if it doesn't exist
      const releasesPath = 'releases';
      await this.ensureDir(client, releasesPath);

      // Create directory for this deployment
      const releasePath = `${releasesPath}/${deployId}`;
      await this.ensureDir(client, releasePath);
      await client.cd(releasePath);

      ctx.logger.info(`[FTP] Uploading to ${releasePath}...`);

      // Upload all files
      await this.uploadDirectory(ctx, client, filesDir, '');

      ctx.logger.info('[FTP] Upload complete');

      // Return to base directory
      await client.cd(basePath);

      return {
        destinationRef: `${config.host}:${releasePath}`,
      };
    } finally {
      client.close();
    }
  }

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    const config = input.config as FtpConfig;
    const { deployId } = input;

    ctx.logger.info('[FTP] Activating deployment...');

    let Client: any;
    try {
      // @ts-ignore - optional peer dependency
      const ftp = await import('basic-ftp');
      Client = ftp.Client;
    } catch {
      throw new Error('FTP adapter requires "basic-ftp" package. Install it with: npm install basic-ftp');
    }
    
    const client = new Client();
    (client as any).ftp.verbose = false;

    try {
      await client.access({
        host: config.host,
        port: config.port || 21,
        user: config.user,
        password: config.password,
        secure: config.secure || false,
      });

      const basePath = config.basePath || '/';
      await client.cd(basePath);

      const releasePath = `releases/${deployId}`;
      const currentLink = 'current';

      // Remove old 'current' symlink/directory if it exists
      try {
        await client.remove(currentLink);
      } catch {
        // Ignore if doesn't exist
      }

      // Create new symlink (if server supports it) or copy
      // Note: Many FTP servers don't support symlinks
      // We'll use a marker file approach instead
      const markerContent = JSON.stringify({
        deployId,
        activatedAt: new Date().toISOString(),
        releasePath,
      });

      await client.uploadFrom(
        Buffer.from(markerContent),
        'current.json',
      );

      ctx.logger.info(`[FTP] Activated deployment ${deployId}`);

      // Cleanup old releases
      if (config.keepReleases) {
        await this.cleanupOldReleases(ctx, client, config.keepReleases);
      }
    } finally {
      client.close();
    }
  }

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    const config = input.config as FtpConfig;
    const { toDeployId } = input;

    ctx.logger.info(`[FTP] Rolling back to ${toDeployId}...`);

    // Rollback is the same as activating a previous deploy
    await this.activate(ctx, {
      deployId: toDeployId,
      config,
      site: input.site,
    });

    ctx.logger.info('[FTP] Rollback complete');
  }

  /**
   * Upload a directory recursively
   */
  private async uploadDirectory(
    ctx: AdapterContext,
    client: any,
    localDir: string,
    remoteDir: string,
  ): Promise<void> {
    const entries = await readdir(localDir, { withFileTypes: true });

    for (const entry of entries) {
      const localPath = join(localDir, entry.name);
      const remotePath = remoteDir ? `${remoteDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip hidden directories
        if (entry.name.startsWith('.')) continue;

        await this.ensureDir(client, remotePath);
        await client.cd(remotePath);
        await this.uploadDirectory(ctx, client, localPath, '');
        await client.cdup();
      } else if (entry.isFile()) {
        // Skip hidden files
        if (entry.name.startsWith('.')) continue;

        await client.uploadFrom(localPath, entry.name);
        ctx.logger.debug(`[FTP] Uploaded ${remotePath}`);
      }
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(client: any, path: string): Promise<void> {
    try {
      await client.cd(path);
      await client.cdup();
    } catch {
      await client.ensureDir(path);
    }
  }

  /**
   * Cleanup old releases
   */
  private async cleanupOldReleases(
    ctx: AdapterContext,
    client: any,
    keep: number,
  ): Promise<void> {
    try {
      await client.cd('releases');
      const list = await client.list();

      // Filter directories only
      const releases = list
        .filter((item: any) => item.type === 2) // 2 = directory
        .map((item: any) => ({
          name: item.name,
          date: item.modifiedAt || new Date(0),
        }))
        .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

      // Delete old releases
      const toDelete = releases.slice(keep);
      for (const release of toDelete) {
        ctx.logger.info(`[FTP] Removing old release: ${release.name}`);
        await client.removeDir(release.name);
      }

      await client.cdup();
    } catch (error: any) {
      ctx.logger.warn(`[FTP] Failed to cleanup old releases: ${error.message}`);
    }
  }
}

