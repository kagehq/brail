import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeploysService } from './deploys.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class DeploysController {
  constructor(private readonly deploysService: DeploysService) {}

  @Post('sites/:siteId/deploys')
  async create(@Param('siteId') siteId: string, @Req() req: any) {
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    return this.deploysService.create(siteId, userId, userEmail, req);
  }

  @Get('deploys/:deployId')
  async get(@Param('deployId') deployId: string) {
    return this.deploysService.getById(deployId);
  }

  @Patch('deploys/:deployId/finalize')
  async finalize(
    @Param('deployId') deployId: string,
    @Body() body: { comment?: string },
    @Req() req: any,
  ) {
    return this.deploysService.finalize(deployId, body.comment, req);
  }

  @Post('deploys/:deployId/activate')
  async activate(
    @Param('deployId') deployId: string,
    @Body() body: { comment?: string },
    @Req() req: any,
  ) {
    return this.deploysService.activate(deployId, body.comment, req);
  }

  @Delete('deploys/:deployId')
  async delete(@Param('deployId') deployId: string, @Req() req: any) {
    return this.deploysService.delete(deployId, req);
  }

  @Post('deploys/:deployId/fail')
  async markAsFailed(@Param('deployId') deployId: string) {
    return this.deploysService.markAsFailed(deployId, 'Upload failed');
  }
}

