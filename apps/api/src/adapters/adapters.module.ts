import { Global, Module } from '@nestjs/common';
import { AdapterRegistry } from './adapter.registry';
import { AdaptersController } from './adapters.controller';

@Global()
@Module({
  controllers: [AdaptersController],
  providers: [AdapterRegistry],
  exports: [AdapterRegistry],
})
export class AdaptersModule {}

