import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdapterBuilderService } from './adapter-builder.service';

@Controller('adapter-builder')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class AdapterBuilderController {
  constructor(
    private readonly adapterBuilderService: AdapterBuilderService,
  ) {}

  @Get('projects')
  async listProjects(@Req() req: any) {
    return this.adapterBuilderService.listProjects(
      req.user.userId || req.user.id,
    );
  }

  @Post('projects')
  async createProject(
    @Body()
    body: {
      name: string;
      displayName: string;
      description: string;
      category: string;
    },
    @Req() req: any,
  ) {
    return this.adapterBuilderService.createProject(
      req.user.userId || req.user.id,
      body.name,
      body.displayName,
      body.description,
      body.category,
    );
  }

  @Get('projects/:projectId')
  async getProject(@Param('projectId') projectId: string) {
    return this.adapterBuilderService.getProject(projectId);
  }

  @Patch('projects/:projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      displayName?: string;
      description?: string;
      category?: string;
      code?: string;
      config?: any;
    },
  ) {
    return this.adapterBuilderService.updateProject(projectId, body);
  }

  @Delete('projects/:projectId')
  async deleteProject(@Param('projectId') projectId: string) {
    return this.adapterBuilderService.deleteProject(projectId);
  }

  @Post('projects/:projectId/test')
  async testAdapter(
    @Param('projectId') projectId: string,
    @Body() body: { testConfig: any },
  ) {
    return this.adapterBuilderService.testAdapter(projectId, body.testConfig);
  }

  @Post('projects/:projectId/publish')
  async publishAdapter(
    @Param('projectId') projectId: string,
    @Body() body: { version: string; changelog?: string },
  ) {
    return this.adapterBuilderService.publishAdapter(
      projectId,
      body.version,
      body.changelog,
    );
  }

  @Get('templates')
  async listTemplates() {
    return this.adapterBuilderService.listAdapterTemplates();
  }

  @Post('generate')
  async generateAdapter(
    @Body()
    body: {
      name: string;
      displayName: string;
      description: string;
      platform: string;
      authType: string;
      deploymentType: string;
    },
    @Req() req: any,
  ) {
    return this.adapterBuilderService.generateAdapter(
      req.user.userId || req.user.id,
      body,
    );
  }
}

