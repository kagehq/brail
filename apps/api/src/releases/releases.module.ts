import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { AdaptersModule } from '../adapters/adapters.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { HealthModule } from '../health/health.module';
import { StorageModule } from '../storage/storage.module';
import { EnvModule } from '../env/env.module';
import { BuildLogsModule } from '../build-logs/build-logs.module';

@Module({
  imports: [AdaptersModule, ProfilesModule, HealthModule, StorageModule, EnvModule, BuildLogsModule],
  controllers: [ReleasesController],
  providers: [ReleasesService],
  exports: [ReleasesService],
})
export class ReleasesModule {}

