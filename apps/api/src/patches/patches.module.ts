import { Module, forwardRef } from '@nestjs/common';
import { PatchesController } from './patches.controller';
import { PatchesService } from './patches.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [PrismaModule, StorageModule, forwardRef(() => SitesModule)],
  controllers: [PatchesController],
  providers: [PatchesService],
  exports: [PatchesService],
})
export class PatchesModule {}

