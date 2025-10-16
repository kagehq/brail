import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfilesService } from './profiles.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('sites/:siteId/profiles')
  async create(
    @Param('siteId') siteId: string,
    @Body() body: { name: string; adapter: string; config: unknown },
  ) {
    return this.profilesService.create(siteId, body.name, body.adapter, body.config);
  }

  @Get('sites/:siteId/profiles')
  async list(@Param('siteId') siteId: string) {
    return this.profilesService.list(siteId);
  }

  @Get('sites/:siteId/profiles/:profileId')
  async get(
    @Param('siteId') siteId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.profilesService.getById(profileId);
  }

  @Patch('sites/:siteId/profiles/:profileId')
  async update(
    @Param('siteId') siteId: string,
    @Param('profileId') profileId: string,
    @Body() body: { name?: string; config?: unknown },
  ) {
    return this.profilesService.update(profileId, body.name, body.config);
  }

  @Delete('sites/:siteId/profiles/:profileId')
  async delete(
    @Param('siteId') siteId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.profilesService.delete(profileId);
  }

  @Post('sites/:siteId/profiles/:profileId/default')
  async setDefault(
    @Param('siteId') siteId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.profilesService.setDefault(siteId, profileId);
  }
}

