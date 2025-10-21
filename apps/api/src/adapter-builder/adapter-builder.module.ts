import { Module } from '@nestjs/common';
import { AdapterBuilderController } from './adapter-builder.controller';
import { AdapterBuilderService } from './adapter-builder.service';

@Module({
  controllers: [AdapterBuilderController],
  providers: [AdapterBuilderService],
  exports: [AdapterBuilderService],
})
export class AdapterBuilderModule {}

