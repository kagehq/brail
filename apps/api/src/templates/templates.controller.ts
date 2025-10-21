import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async list(): Promise<any[]> {
    return this.templatesService.listTemplates();
  }

  @Get(':templateId')
  async get(@Param('templateId') templateId: string): Promise<any> {
    return this.templatesService.getTemplate(templateId);
  }

  @Post(':templateId/clone')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async clone(
    @Param('templateId') templateId: string,
    @Body() body: { siteName: string; variables?: Record<string, string> },
    @Req() req: any,
  ) {
    return this.templatesService.cloneTemplate(
      templateId,
      body.siteName,
      req.user.userId || req.user.id,
      body.variables,
    );
  }

  @Post(':templateId/deploy')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async deploy(
    @Param('templateId') templateId: string,
    @Body()
    body: {
      siteName: string;
      variables?: Record<string, string>;
      adapter?: string;
      config?: unknown;
      profileId?: string;
    },
    @Req() req: any,
  ) {
    return this.templatesService.deployTemplate(
      templateId,
      body.siteName,
      req.user.userId || req.user.id,
      body.variables,
      body.adapter,
      body.config,
      body.profileId,
    );
  }
}

