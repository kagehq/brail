import { Controller, Get, Param, Query } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('deploys/:deployId/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(
    @Param('deployId') deployId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.logsService.getLatest(deployId, limitNum);
  }
}

