import { Module, forwardRef } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PatchesModule } from '../patches/patches.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => PatchesModule), AuditModule],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}

