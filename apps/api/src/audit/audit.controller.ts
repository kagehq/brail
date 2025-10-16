import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

@Controller('sites/:siteId/audit')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Param('siteId') siteId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list({
      siteId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      action,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  async stats(
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
  ) {
    return this.auditService.getStats(siteId, days ? parseInt(days) : 30);
  }
}

