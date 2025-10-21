import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { SitesModule } from '../sites/sites.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [SitesModule, StorageModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

