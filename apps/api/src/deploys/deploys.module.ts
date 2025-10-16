import { Module, forwardRef } from '@nestjs/common';
import { DeploysController } from './deploys.controller';
import { DeploysService } from './deploys.service';
import { SitesModule } from '../sites/sites.module';
import { LogsModule } from '../logs/logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SitesModule, forwardRef(() => LogsModule), NotificationsModule, AuditModule],
  controllers: [DeploysController],
  providers: [DeploysService],
  exports: [DeploysService],
})
export class DeploysModule {}

