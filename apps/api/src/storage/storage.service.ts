import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'br-deploys';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });

    this.logger.log(
      `Storage initialized: ${endpoint}/${this.bucket} (region: ${region})`,
    );
  }

  /**
   * Upload an object to S3
   */
  async putObject(
    key: string,
    body: Buffer | Readable | string,
    contentType?: string,
    options?: {
      immutable?: boolean;
      metadata?: Record<string, string>;
    },
  ): Promise<{ etag: string }> {
    const cacheControl = options?.immutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body as any,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: options?.metadata,
    });

    const result = await this.client.send(command);

    this.logger.debug(`Uploaded: ${key} (ETag: ${result.ETag})`);

    return {
      etag: result.ETag || '',
    };
  }

  /**
   * Get an object as a stream
   */
  async getObjectStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const result = await this.client.send(command);

    if (!result.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    return result.Body as Readable;
  }

  /**
   * Get object metadata
   */
  async headObject(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    etag?: string;
    metadata?: Record<string, string>;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const result = await this.client.send(command);

    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
      metadata: result.Metadata,
    };
  }

  /**
   * Check if an object exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.headObject(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy an object
   */
  async copyObject(srcKey: string, dstKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${srcKey}`,
      Key: dstKey,
    });

    await this.client.send(command);

    this.logger.debug(`Copied: ${srcKey} -> ${dstKey}`);
  }

  /**
   * List objects with a prefix
   */
  async listPrefix(
    prefix: string,
  ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const result = await this.client.send(command);

    return (result.Contents || []).map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }));
  }

  /**
   * Get object as JSON
   */
  async getObjectJSON<T = any>(key: string): Promise<T> {
    const stream = await this.getObjectStream(key);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const data = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(data);
  }

  /**
   * Put object as JSON
   */
  async putObjectJSON(key: string, data: any): Promise<{ etag: string }> {
    const json = JSON.stringify(data);
    return this.putObject(key, json, 'application/json');
  }

  /**
   * Delete an object
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);

    this.logger.debug(`Deleted: ${key}`);
  }

  /**
   * Build key paths
   */
  getDeployPath(deployId: string, filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, '');
    return `deploys/${deployId}/${cleanPath}`;
  }

  getSiteCurrentPath(siteId: string): string {
    return `sites/${siteId}/current.json`;
  }

  getDeployManifestPath(deployId: string): string {
    return `deploys/${deployId}/manifest.json`;
  }

  getDeployIndexPath(deployId: string): string {
    return `deploys/${deployId}/index.json`;
  }
}

