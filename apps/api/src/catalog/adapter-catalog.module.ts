import { Module } from '@nestjs/common';
import { AdapterCatalogController } from './adapter-catalog.controller';
import { AdapterCatalogService } from './adapter-catalog.service';

@Module({
  controllers: [AdapterCatalogController],
  providers: [AdapterCatalogService],
  exports: [AdapterCatalogService],
})
export class AdapterCatalogModule {}

