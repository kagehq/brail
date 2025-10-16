import {
  Controller,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Headers,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';

@Controller('simple-uploads')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class SimpleUploadController {
  private readonly logger = new Logger(SimpleUploadController.name);

  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Headers('x-deploy-id') deployId: string,
    @Headers('x-relpath') relPath: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!deployId || !relPath) {
      throw new BadRequestException(
        'Missing required headers: x-deploy-id and x-relpath',
      );
    }

    try {
      // Normalize path
      const cleanPath = relPath.replace(/^\/+/, '').replace(/\\/g, '/');

      // Upload to S3
      const s3Key = this.storage.getDeployPath(deployId, cleanPath);

      // Determine content type from file extension
      const contentType = file.mimetype || this.getContentType(cleanPath);
      
      await this.storage.putObject(s3Key, file.buffer, contentType);

      this.logger.log(`Uploaded: ${cleanPath} (${file.size} bytes)`);

      return {
        success: true,
        key: s3Key,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Upload error: ${error.message}`);
      throw error;
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      txt: 'text/plain',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}

