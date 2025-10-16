import { Module, forwardRef } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { SimpleUploadController } from './simple-upload.controller';
import { StorageModule } from '../storage/storage.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [StorageModule, forwardRef(() => LogsModule)],
  controllers: [UploadsController, SimpleUploadController],
})
export class UploadsModule {}

