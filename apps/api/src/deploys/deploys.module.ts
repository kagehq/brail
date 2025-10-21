import { Module, forwardRef } from '@nestjs/common';
import { DeploysController } from './deploys.controller';
import { DeploysService } from './deploys.service';
import { CleanupService } from './cleanup.service';
import { SitesModule } from '../sites/sites.module';
import { LogsModule } from '../logs/logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdaptersModule } from '../adapters/adapters.module';

@Module({
  imports: [SitesModule, forwardRef(() => LogsModule), NotificationsModule, AuditModule, ProfilesModule, AdaptersModule],
  controllers: [DeploysController],
  providers: [DeploysService, CleanupService],
  exports: [DeploysService],
})
export class DeploysModule {}

