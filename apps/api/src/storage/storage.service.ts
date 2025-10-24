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
    // Support both S3_ and MINIO_ environment variable prefixes
    const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
    const region = process.env.S3_REGION || process.env.MINIO_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'br-deploys';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.MINIO_FORCE_PATH_STYLE === 'true',
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



import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { lookup } from 'mime-types';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    // Support both S3_ and MINIO_ environment variable prefixes
    const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
    const region = process.env.S3_REGION || process.env.MINIO_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'br-deploys';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.MINIO_FORCE_PATH_STYLE === 'true',
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

  /**
   * Get a file's stream and content type for a given deployment.
   * Throws NotFoundException if the object does not exist.
   */
  async getFileStream(
    deploymentId: string,
    filePath: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const key = this.getDeployPath(deploymentId, filePath);

    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const result = await this.client.send(command);

      if (!result.Body || !(result.Body instanceof Readable)) {
        // This case is unlikely if GetObject succeeds, but good for type safety
        throw new Error(`S3 returned an invalid body for key: ${key}`);
      }

      const stream = result.Body;
      // Prefer the content type from S3 metadata, fall back to inferring from file path
      const contentType = result.ContentType || this.inferContentType(filePath);

      return { stream, contentType };
    } catch (error) {
      // AWS SDK v3 throws a specific error when the key is not found
      if (error instanceof NoSuchKey) {
        throw new NotFoundException('Deployment or file not found.');
      }
      this.logger.error(`Error getting object ${key}: ${error}`);
      throw error; // Re-throw other unexpected errors
    }
  }

  /**
   * Infer Content-Type based on file extension.
   * Defaults to 'application/octet-stream' if unknown.
   */
  private inferContentType(filePath: string): string {
    return lookup(filePath) || 'application/octet-stream';
  }
}