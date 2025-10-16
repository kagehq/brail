import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { AdaptersModule } from '../adapters/adapters.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { HealthModule } from '../health/health.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AdaptersModule, ProfilesModule, HealthModule, StorageModule],
  controllers: [ReleasesController],
  providers: [ReleasesService],
  exports: [ReleasesService],
})
export class ReleasesModule {}

