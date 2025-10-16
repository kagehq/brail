import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import * as path from 'path';

@Controller('uploads')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly tusServer: Server;

  constructor() {
    const bucket = process.env.S3_BUCKET || 'br-deploys';

    // Create tus server with S3 store
    this.tusServer = new Server({
      path: '/v1/uploads',
      datastore: new S3Store({
        partSize: 5 * 1024 * 1024, // 5MB (minimum for S3 multipart)
        minPartSize: 5 * 1024 * 1024, // 5MB minimum
        s3ClientConfig: {
          bucket,
          region: process.env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || '',
            secretAccessKey: process.env.S3_SECRET_KEY || '',
          },
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        },
      }),
      namingFunction: (req) => {
        // Extract deploy ID and relative path from metadata
        const deployId = req.headers['x-deploy-id'] as string;
        const relPath = req.headers['x-relpath'] as string;

        if (!deployId || !relPath) {
          throw new Error(
            'Missing required headers: x-deploy-id and x-relpath',
          );
        }

        // Normalize path
        const cleanPath = relPath.replace(/^\/+/, '').replace(/\\/g, '/');

        // Return S3 key
        return `deploys/${deployId}/${cleanPath}`;
      },
      // Allow resumable uploads
      respectForwardedHeaders: true,
      // Max file size (10GB)
      maxSize: 10 * 1024 * 1024 * 1024,
      onUploadFinish: async (req, res, upload) => {
        this.logger.log(`Upload finished: ${upload.id} (${upload.size} bytes)`);
        return res;
      },
    });
  }

  @All('*')
  async handleTusWildcard(@Req() req: Request, @Res() res: Response) {
    return this.tusServer.handle(req, res);
  }

  @All()
  async handleTusBase(@Req() req: Request, @Res() res: Response) {
    return this.tusServer.handle(req, res);
  }
}

