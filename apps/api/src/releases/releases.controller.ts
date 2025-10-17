import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReleasesService } from './releases.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get('sites/:siteId/releases')
  async list(@Param('siteId') siteId: string) {
    return this.releasesService.listReleases(siteId);
  }

  @Post('deploys/:deployId/stage')
  async stage(
    @Param('deployId') deployId: string,
    @Body()
    body: {
      profileId?: string;
      adapter?: string;
      config?: unknown;
      target?: 'preview' | 'production';
    },
  ) {
    return this.releasesService.stageRelease(
      deployId,
      body.profileId,
      body.adapter,
      body.config,
      body.target,
    );
  }

  @Post('deploys/:deployId/activate')
  async activate(
    @Param('deployId') deployId: string,
    @Body()
    body: {
      profileId?: string;
      adapter?: string;
      config?: unknown;
      target?: 'preview' | 'production';
      comment?: string;
    },
  ) {
    return this.releasesService.activateRelease(
      deployId,
      body.profileId,
      body.adapter,
      body.config,
      body.target,
      body.comment,
    );
  }

  @Post('sites/:siteId/rollback')
  async rollback(
    @Param('siteId') siteId: string,
    @Body()
    body: {
      toDeployId: string;
      profileId?: string;
      adapter?: string;
      config?: unknown;
    },
  ) {
    return this.releasesService.rollbackRelease(
      siteId,
      body.toDeployId,
      body.profileId,
      body.adapter,
      body.config,
    );
  }

  @Delete('releases/:releaseId')
  async delete(@Param('releaseId') releaseId: string) {
    return this.releasesService.deleteRelease(releaseId);
  }
}

