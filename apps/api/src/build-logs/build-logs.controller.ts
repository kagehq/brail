import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { BuildLogsService, CreateBuildLogDto, UpdateBuildLogDto } from './build-logs.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class BuildLogsController {
  constructor(private readonly buildLogsService: BuildLogsService) {}

  /**
   * Create a new build log
   */
  @Post('v1/sites/:siteId/build-logs')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('siteId') siteId: string,
    @Body() data: Omit<CreateBuildLogDto, 'siteId'>,
  ) {
    return this.buildLogsService.create({ ...data, siteId });
  }

  /**
   * Update a build log
   */
  @Patch('v1/build-logs/:id')
  async update(@Param('id') id: string, @Body() data: UpdateBuildLogDto) {
    return this.buildLogsService.update(id, data);
  }

  /**
   * Get a specific build log
   */
  @Get('v1/build-logs/:id')
  async findOne(@Param('id') id: string) {
    return this.buildLogsService.findOne(id);
  }

  /**
   * List build logs for a site
   */
  @Get('v1/sites/:siteId/build-logs')
  async findBySite(@Param('siteId') siteId: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.buildLogsService.findBySite(siteId, limitNum);
  }

  /**
   * Get build log for a deploy
   */
  @Get('v1/deploys/:deployId/build-log')
  async findByDeploy(@Param('deployId') deployId: string) {
    return this.buildLogsService.findByDeploy(deployId);
  }

  /**
   * Download build log as text file
   */
  @Get('v1/build-logs/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const log = await this.buildLogsService.findOne(id);

    const content = [
      `Build Log`,
      `==========`,
      ``,
      `Framework: ${log.framework}`,
      `Command: ${log.command}`,
      `Status: ${log.status}`,
      `Exit Code: ${log.exitCode}`,
      `Duration: ${log.duration}ms`,
      `Started: ${log.startedAt.toISOString()}`,
      log.completedAt ? `Completed: ${log.completedAt.toISOString()}` : '',
      ``,
      `--- STDOUT ---`,
      log.stdout || '(empty)',
      ``,
      log.stderr ? `--- STDERR ---` : '',
      log.stderr || '',
      ``,
      log.warnings && (log.warnings as any[]).length > 0 ? `--- WARNINGS ---` : '',
      log.warnings ? JSON.stringify(log.warnings, null, 2) : '',
    ]
      .filter(Boolean)
      .join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=build-${log.id}.txt`);
    res.send(content);
  }

  /**
   * Delete a build log
   */
  @Delete('v1/build-logs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.buildLogsService.delete(id);
  }
}

