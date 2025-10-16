import { Client } from 'ssh2';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFile } from 'fs/promises';
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
 * SSH+rsync adapter for blue/green deployments
 * Uploads to releases directory and atomically flips symlink
 */
export class SshRsyncAdapter implements DeployAdapter {
  name = 'ssh-rsync';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.host || typeof c.host !== 'string') {
      return { valid: false, reason: 'host is required' };
    }

    if (!c.user || typeof c.user !== 'string') {
      return { valid: false, reason: 'user is required' };
    }

    if (!c.basePath || typeof c.basePath !== 'string') {
      return { valid: false, reason: 'basePath is required' };
    }

    if (!c.privateKey || typeof c.privateKey !== 'string') {
      return { valid: false, reason: 'privateKey is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    ctx.logger.info(
      `[SSH] Uploading ${deployId} to ${config.host}:${config.basePath}/releases/${deployId}`,
    );

    // Write canary file
    const canaryPath = join(filesDir, '__release.txt');
    await writeFile(canaryPath, deployId, 'utf-8');

    // Construct remote path
    const remotePath = `${config.basePath}/releases/${deployId}/`;
    const remoteUser = config.user;
    const remoteHost = config.host;
    const remotePort = config.port || 22;

    // Ensure releases directory exists
    await this.execSSH(config, `mkdir -p ${config.basePath}/releases`);

    // rsync files
    await this.rsync(config, filesDir, remotePath);

    ctx.logger.info(`[SSH] Upload complete for ${deployId}`);

    return { destinationRef: remotePath };
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    const config = input.config as any;
    const { deployId, site } = input;

    ctx.logger.info(`[SSH] Activating ${deployId}`);

    // Health check if configured
    if (config.health) {
      await this.healthCheck(ctx, config, deployId);
    }

    // Atomic symlink flip
    const releasePath = `${config.basePath}/releases/${deployId}`;
    const currentLink = `${config.basePath}/current`;

    const commands = [
      `ln -sfn ${releasePath} ${currentLink}`,
      // Optional: reload nginx or other services
      `(systemctl reload nginx 2>/dev/null || true)`,
    ];

    await this.execSSH(config, commands.join(' && '));

    ctx.logger.info(`[SSH] Activated ${deployId} -> ${currentLink}`);
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput,
  ): Promise<void> {
    const config = input.config as any;
    const { toDeployId, site } = input;

    ctx.logger.info(`[SSH] Rolling back to ${toDeployId}`);

    // Same as activate but with toDeployId
    const releasePath = `${config.basePath}/releases/${toDeployId}`;
    const currentLink = `${config.basePath}/current`;

    await this.execSSH(config, `ln -sfn ${releasePath} ${currentLink}`);

    ctx.logger.info(`[SSH] Rolled back to ${toDeployId}`);
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;

    // List releases directory
    const output = await this.execSSH(
      c,
      `ls -1t ${c.basePath}/releases 2>/dev/null || true`,
    );

    // Find which is current
    const currentTarget = await this.execSSH(
      c,
      `readlink ${c.basePath}/current 2>/dev/null || echo ''`,
    ).catch(() => '');

    const currentDeployId = currentTarget.trim().split('/').pop() || '';

    const releases = output
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((deployId) => ({
        id: deployId.trim(),
        timestamp: new Date().toISOString(),
        status: (deployId.trim() === currentDeployId ? 'active' : 'staged') as 'active' | 'staged' | 'failed',
      }));

    return releases;
  }

  async cleanupOld(
    ctx: AdapterContext,
    config: unknown,
    keep: number,
  ): Promise<void> {
    const c = config as any;
    const keepReleases = c.keepReleases || keep || 5;

    ctx.logger.info(`[SSH] Cleaning up old releases (keeping ${keepReleases})`);

    // List all releases sorted by time
    const output = await this.execSSH(
      c,
      `ls -1t ${c.basePath}/releases 2>/dev/null || true`,
    );

    const releases = output
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.trim());

    // Keep the newest N
    const toDelete = releases.slice(keepReleases);

    if (toDelete.length === 0) {
      ctx.logger.info('[SSH] No old releases to clean up');
      return;
    }

    for (const deployId of toDelete) {
      ctx.logger.info(`[SSH] Removing old release: ${deployId}`);
      await this.execSSH(c, `rm -rf ${c.basePath}/releases/${deployId}`);
    }

    ctx.logger.info(`[SSH] Cleanup complete (removed ${toDelete.length} old releases)`);
  }

  /**
   * Execute command via SSH
   */
  private async execSSH(config: any, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';
      let errorOutput = '';

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              return reject(err);
            }

            stream
              .on('close', (code: number) => {
                conn.end();
                if (code !== 0) {
                  reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
                } else {
                  resolve(output);
                }
              })
              .on('data', (data: Buffer) => {
                output += data.toString();
              })
              .stderr.on('data', (data: Buffer) => {
                errorOutput += data.toString();
              });
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect({
          host: config.host,
          port: config.port || 22,
          username: config.user,
          privateKey: config.privateKey,
        });
    });
  }

  /**
   * Rsync files to remote
   */
  private async rsync(
    config: any,
    localPath: string,
    remotePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const remoteTarget = `${config.user}@${config.host}:${remotePath}`;
      const port = config.port || 22;

      // Ensure local path ends with /
      const local = localPath.endsWith('/') ? localPath : `${localPath}/`;

      const args = [
        '-az',
        '--delete',
        '-e',
        `ssh -p ${port} -o StrictHostKeyChecking=no`,
        local,
        remoteTarget,
      ];

      const proc = spawn('rsync', args);

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `rsync failed with code ${code}: ${errorOutput || output}`,
            ),
          );
        } else {
          resolve();
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Health check before activation
   */
  private async healthCheck(
    ctx: AdapterContext,
    config: any,
    deployId: string,
  ): Promise<void> {
    if (!config.health) return;

    const { mode, url, canaryPath, timeoutMs, retries } = config.health;
    const timeout = timeoutMs || 8000;
    const maxRetries = retries || 5;

    ctx.logger.info(`[SSH] Health check: ${mode}`);

    if (mode === 'url' && url) {
      await this.checkUrl(ctx, url, timeout, maxRetries);
    } else if (mode === 'canary' && canaryPath) {
      await this.checkCanary(ctx, canaryPath, deployId, timeout, maxRetries);
    }
  }

  private async checkUrl(
    ctx: AdapterContext,
    url: string,
    timeout: number,
    retries: number,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          ctx.logger.info('[SSH] Health check passed');
          return;
        }

        ctx.logger.info(
          `[SSH] Health check attempt ${i + 1}/${retries}: ${response.status}`,
        );
      } catch (error) {
        ctx.logger.info(
          `[SSH] Health check attempt ${i + 1}/${retries} failed: ${error}`,
        );
      }

      if (i < retries - 1) {
        await this.sleep(1000 * (i + 1)); // Exponential backoff
      }
    }

    throw new Error('Health check failed after all retries');
  }

  private async checkCanary(
    ctx: AdapterContext,
    canaryPath: string,
    expectedDeployId: string,
    timeout: number,
    retries: number,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(canaryPath, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const body = await response.text();
          if (body.trim() === expectedDeployId) {
            ctx.logger.info('[SSH] Canary check passed');
            return;
          }
        }

        ctx.logger.info(
          `[SSH] Canary check attempt ${i + 1}/${retries}: mismatch`,
        );
      } catch (error) {
        ctx.logger.info(
          `[SSH] Canary check attempt ${i + 1}/${retries} failed: ${error}`,
        );
      }

      if (i < retries - 1) {
        await this.sleep(1000 * (i + 1));
      }
    }

    throw new Error('Canary check failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

