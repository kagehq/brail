import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import * as path from 'path';
import { LogsService } from '../logs/logs.service';

@Controller('uploads')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly tusServer: Server;
  private uploadCounters = new Map<string, { total: number; completed: number }>();

  constructor(
    @Inject(forwardRef(() => LogsService))
    private readonly logsService: LogsService,
  ) {
    // Support both S3_ and MINIO_ environment variable prefixes
    const bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'br-deploys';

    // Create tus server with S3 store
    this.tusServer = new Server({
      path: '/v1/uploads',
      datastore: new S3Store({
        partSize: 5 * 1024 * 1024, // 5MB (minimum for S3 multipart)
        minPartSize: 5 * 1024 * 1024, // 5MB minimum
        s3ClientConfig: {
          bucket,
          region: process.env.S3_REGION || process.env.MINIO_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || '',
            secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || '',
          },
          endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.MINIO_FORCE_PATH_STYLE === 'true',
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
      onUploadCreate: async (req, res, upload) => {
        const deployId = req.headers['x-deploy-id'] as string;
        const relPath = req.headers['x-relpath'] as string;
        
        if (deployId && relPath) {
          const deployLogger = this.logsService.createLogger(deployId);
          const fileName = path.basename(relPath);
          
          // Track upload progress
          if (!this.uploadCounters.has(deployId)) {
            this.uploadCounters.set(deployId, { total: 0, completed: 0 });
          }
          const counter = this.uploadCounters.get(deployId)!;
          counter.total++;
          
          await deployLogger.info(`Uploading ${fileName}...`);
          const size = upload.size || 0;
          this.logger.log(`Upload started: ${deployId}/${relPath} (${size} bytes)`);
        }
        
        return res;
      },
      onUploadFinish: async (req, res, upload) => {
        const deployId = req.headers['x-deploy-id'] as string;
        const relPath = req.headers['x-relpath'] as string;
        
        if (deployId && relPath) {
          const deployLogger = this.logsService.createLogger(deployId);
          const fileName = path.basename(relPath);
          const size = upload.size || 0;
          const sizeKB = (size / 1024).toFixed(2);
          
          // Update progress counter
          const counter = this.uploadCounters.get(deployId);
          if (counter) {
            counter.completed++;
            await deployLogger.info(`✓ Uploaded ${fileName} (${sizeKB} KB) - ${counter.completed}/${counter.total} files`);
          } else {
            await deployLogger.info(`✓ Uploaded ${fileName} (${sizeKB} KB)`);
          }
          
          this.logger.log(`Upload finished: ${upload.id} (${size} bytes)`);
        }
        
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

