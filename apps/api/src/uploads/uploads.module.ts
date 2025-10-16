import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { SimpleUploadController } from './simple-upload.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController, SimpleUploadController],
})
export class UploadsModule {}

