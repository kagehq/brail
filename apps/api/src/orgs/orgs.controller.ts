import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgsService } from './orgs.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get('orgs/current')
  async getCurrent(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.orgsService.getCurrentOrg(userId);
  }

  @Post('orgs/:orgId/invites')
  async inviteMember(
    @Param('orgId') orgId: string,
    @Req() req: any,
    @Body() body: { email: string; role?: string },
  ) {
    const userId = req.user.userId || req.user.id;
    return this.orgsService.inviteMember(orgId, userId, body.email, body.role);
  }

  @Delete('orgs/:orgId/invites/:inviteId')
  async cancelInvite(
    @Param('orgId') orgId: string,
    @Param('inviteId') inviteId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.orgsService.cancelInvite(orgId, userId, inviteId);
  }

  @Patch('orgs/:orgId/members/:memberId')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
    @Body() body: { role: string },
  ) {
    const userId = req.user.userId || req.user.id;
    return this.orgsService.updateMemberRole(orgId, userId, memberId, body.role);
  }

  @Delete('orgs/:orgId/members/:memberId')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.orgsService.removeMember(orgId, userId, memberId);
  }
}

