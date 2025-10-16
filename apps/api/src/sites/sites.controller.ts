import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SitesService } from './sites.service';
import { PatchesService } from '../patches/patches.service';

@Controller('sites')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    @Inject(forwardRef(() => PatchesService))
    private readonly patchesService: PatchesService,
  ) {}

  @Post()
  async create(@Body() body: { name: string }, @Req() req: any) {
    return this.sitesService.create(req.user.userId || req.user.id, body.name);
  }

  @Get()
  async list(@Req() req: any) {
    return this.sitesService.listByUser(req.user.userId || req.user.id);
  }

  @Get(':siteId')
  async get(@Param('siteId') siteId: string) {
    return this.sitesService.getById(siteId);
  }

  @Get(':siteId/deploys')
  async listDeploys(@Param('siteId') siteId: string) {
    return this.sitesService.listDeploys(siteId);
  }

  @Get(':siteId/tree')
  async getFileTree(@Param('siteId') siteId: string) {
    return this.patchesService.getFileTree(siteId);
  }

  @Delete(':siteId')
  async delete(@Param('siteId') siteId: string) {
    return this.sitesService.delete(siteId);
  }
}

