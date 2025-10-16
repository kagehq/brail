import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';
import { DeploysModule } from './deploys/deploys.module';
import { UploadsModule } from './uploads/uploads.module';
import { DomainsModule } from './domains/domains.module';
import { TokensModule } from './tokens/tokens.module';
import { PublicModule } from './public/public.module';
import { AdaptersModule } from './adapters/adapters.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ReleasesModule } from './releases/releases.module';
import { LogsModule } from './logs/logs.module';
import { PatchesModule } from './patches/patches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { BuildModule } from './build/build.module';
import { BuildLogsModule } from './build-logs/build-logs.module';
import { SslModule } from './ssl/ssl.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AdaptersModule,
    HealthModule,
    AuthModule,
    SitesModule,
    DeploysModule,
    UploadsModule,
    DomainsModule,
    TokensModule,
    ProfilesModule,
    ReleasesModule,
    LogsModule,
    PatchesModule,
    NotificationsModule,
    AuditModule,
    BuildModule,
    BuildLogsModule,
    SslModule,
    PublicModule,
  ],
})
export class AppModule {}

