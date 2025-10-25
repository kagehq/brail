import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { BuildLogsModule } from './build-logs/build-logs.module';
import { SslModule } from './ssl/ssl.module';
import { EnvModule } from './env/env.module';
import { OrgsModule } from './orgs/orgs.module';
import { AdapterCatalogModule } from './catalog/adapter-catalog.module';
import { TemplatesModule } from './templates/templates.module';
import { AdapterBuilderModule } from './adapter-builder/adapter-builder.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 60, // 60 requests per minute (default for all endpoints)
      },
    ]),
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
    BuildLogsModule,
    SslModule,
    EnvModule,
    OrgsModule,
    AdapterCatalogModule,
    TemplatesModule,
    AdapterBuilderModule,
    PublicModule,
  ],
})
export class AppModule {}
