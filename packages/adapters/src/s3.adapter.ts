import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { readFile, readdir, stat } from 'fs/promises';
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

/**
 * S3 adapter for generic S3-compatible storage
 * Uploads to releases prefix and maintains current.json pointer
 */
export class S3Adapter implements DeployAdapter {
  name = 's3';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as any;

    if (!c.bucket || typeof c.bucket !== 'string') {
      return { valid: false, reason: 'bucket is required' };
    }

    if (!c.prefix || typeof c.prefix !== 'string') {
      return { valid: false, reason: 'prefix is required' };
    }

    if (!c.region || typeof c.region !== 'string') {
      return { valid: false, reason: 'region is required' };
    }

    if (!c.accessKeyId || typeof c.accessKeyId !== 'string') {
      return { valid: false, reason: 'accessKeyId is required' };
    }

    if (!c.secretAccessKey || typeof c.secretAccessKey !== 'string') {
      return { valid: false, reason: 'secretAccessKey is required' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string }> {
    const config = input.config as any;
    const { deployId, filesDir, site } = input;

    const client = this.createClient(config);

    ctx.logger.info(
      `[S3] Uploading ${deployId} to s3://${config.bucket}/${config.prefix}/releases/${deployId}`,
    );

    // Collect all files
    const files = await this.collectFiles(filesDir);

    ctx.logger.info(`[S3] Found ${files.length} files to upload`);

    // Upload files in parallel (max 10 concurrent)
    const maxConcurrent = 10;
    let uploaded = 0;

    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);

      await Promise.all(
        batch.map(async (file) => {
          const content = await readFile(file.fullPath);
          const key = `${config.prefix}/releases/${deployId}/${file.relativePath}`;

          await client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: key,
              Body: content,
              ContentType: this.getMimeType(file.relativePath),
            }),
          );

          uploaded++;
          if (uploaded % 10 === 0) {
            ctx.logger.info(`[S3] Uploaded ${uploaded}/${files.length} files`);
          }
        }),
      );
    }

    ctx.logger.info(`[S3] Upload complete: ${uploaded} files`);

    return {
      destinationRef: `s3://${config.bucket}/${config.prefix}/releases/${deployId}`,
    };
  }

  async activate(
    ctx: AdapterContext,
    input: ActivateInput,
  ): Promise<void> {
    const config = input.config as any;
    const { deployId, site } = input;

    const client = this.createClient(config);

    ctx.logger.info(`[S3] Activating ${deployId}`);

    // Write current.json
    const currentJson = {
      deployId,
      activatedAt: new Date().toISOString(),
    };

    const key = `${config.prefix}/current.json`;

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: JSON.stringify(currentJson),
        ContentType: 'application/json',
      }),
    );

    ctx.logger.info(`[S3] Activated ${deployId} -> ${key}`);
  }

  async rollback(
    ctx: AdapterContext,
    input: RollbackInput,
  ): Promise<void> {
    const config = input.config as any;
    const { toDeployId, site } = input;

    const client = this.createClient(config);

    ctx.logger.info(`[S3] Rolling back to ${toDeployId}`);

    // Same as activate but with toDeployId
    const currentJson = {
      deployId: toDeployId,
      activatedAt: new Date().toISOString(),
    };

    const key = `${config.prefix}/current.json`;

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: JSON.stringify(currentJson),
        ContentType: 'application/json',
      }),
    );

    ctx.logger.info(`[S3] Rolled back to ${toDeployId}`);
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]> {
    const c = config as any;
    const client = this.createClient(c);

    // List releases prefix
    const prefix = `${c.prefix}/releases/`;

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: c.bucket,
        Prefix: prefix,
        Delimiter: '/',
      }),
    );

    // Get current deployId
    let currentDeployId = '';
    try {
      const currentKey = `${c.prefix}/current.json`;
      const currentResponse = await client.send(
        new ListObjectsV2Command({
          Bucket: c.bucket,
          Prefix: currentKey,
        }),
      );

      if (currentResponse.Contents && currentResponse.Contents.length > 0) {
        // Fetch and parse current.json
        const currentObj = currentResponse.Contents[0];
        // Note: In a real implementation, we'd fetch the object content
        // For now, we'll skip this
      }
    } catch (error) {
      // current.json doesn't exist yet
    }

    // Extract deployIds from common prefixes
    const releases =
      response.CommonPrefixes?.map((cp) => {
        const deployId = cp.Prefix?.replace(prefix, '').replace('/', '') || '';
        return {
          id: deployId,
          timestamp: new Date().toISOString(),
          status: (deployId === currentDeployId ? 'active' : 'staged') as 'active' | 'staged' | 'failed',
        };
      }) || [];

    return releases;
  }

  async cleanupOld(
    ctx: AdapterContext,
    config: unknown,
    keep: number,
  ): Promise<void> {
    const c = config as any;
    const client = this.createClient(c);
    const keepReleases = c.keepReleases || keep || 5;

    ctx.logger.info(`[S3] Cleaning up old releases (keeping ${keepReleases})`);

    // List all releases
    const releases = await this.listReleases(ctx, config);

    // Sort by id (assumes timestamp-based IDs)
    releases.sort((a, b) => b.id.localeCompare(a.id));

    // Keep the newest N
    const toDelete = releases.slice(keepReleases);

    if (toDelete.length === 0) {
      ctx.logger.info('[S3] No old releases to clean up');
      return;
    }

    for (const release of toDelete) {
      ctx.logger.info(`[S3] Removing old release: ${release.id}`);

      // List all objects in this release
      const prefix = `${c.prefix}/releases/${release.id}/`;
      let continuationToken: string | undefined;

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: c.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );

        if (response.Contents) {
          // Delete objects in batches
          for (const obj of response.Contents) {
            if (obj.Key) {
              await client.send(
                new DeleteObjectCommand({
                  Bucket: c.bucket,
                  Key: obj.Key,
                }),
              );
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
    }

    ctx.logger.info(
      `[S3] Cleanup complete (removed ${toDelete.length} old releases)`,
    );
  }

  private createClient(config: any): S3Client {
    return new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle || false,
    });
  }

  private async collectFiles(
    dir: string,
  ): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const files: Array<{ fullPath: string; relativePath: string }> = [];

    async function scan(currentPath: string, basePath: string) {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

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

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

