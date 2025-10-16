import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnvService, SetEnvVarDto } from './env.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class EnvController {
  constructor(private readonly envService: EnvService) {}

  /**
   * List environment variables for a site
   * GET /v1/sites/:siteId/env?scope=build
   */
  @Get('sites/:siteId/env')
  async listEnvVars(
    @Param('siteId') siteId: string,
    @Query('scope') scope?: string,
  ) {
    try {
      return await this.envService.list(siteId, scope);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to list environment variables',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get a single environment variable
   * GET /v1/sites/:siteId/env/:scope/:key
   */
  @Get('sites/:siteId/env/:scope/:key')
  async getEnvVar(
    @Param('siteId') siteId: string,
    @Param('scope') scope: string,
    @Param('key') key: string,
  ) {
    try {
      return await this.envService.get(siteId, scope, key);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get environment variable',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Reveal the actual value of a secret environment variable
   * GET /v1/sites/:siteId/env/:scope/:key/reveal
   */
  @Get('sites/:siteId/env/:scope/:key/reveal')
  async revealEnvVar(
    @Param('siteId') siteId: string,
    @Param('scope') scope: string,
    @Param('key') key: string,
  ) {
    try {
      const value = await this.envService.reveal(siteId, scope, key);
      return { value };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to reveal environment variable',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Set (create or update) an environment variable
   * POST /v1/sites/:siteId/env
   * Body: { scope, key, value, isSecret? }
   */
  @Post('sites/:siteId/env')
  async setEnvVar(
    @Param('siteId') siteId: string,
    @Body() dto: SetEnvVarDto,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const userEmail = req.user?.email;

      return await this.envService.set(siteId, dto, userId, userEmail, req);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to set environment variable',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Delete an environment variable
   * DELETE /v1/sites/:siteId/env
   * Body: { scope, key }
   */
  @Delete('sites/:siteId/env')
  async deleteEnvVar(
    @Param('siteId') siteId: string,
    @Body() body: { scope: string; key: string },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const userEmail = req.user?.email;

      await this.envService.delete(
        siteId,
        body.scope,
        body.key,
        userId,
        userEmail,
        req,
      );

      return {
        success: true,
        message: 'Environment variable deleted',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete environment variable',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Bulk import environment variables
   * POST /v1/sites/:siteId/env/bulk
   * Body: { scope, vars: { KEY: "value", ... }, isSecret? }
   */
  @Post('sites/:siteId/env/bulk')
  async bulkSetEnvVars(
    @Param('siteId') siteId: string,
    @Body() body: { scope: string; vars: Record<string, string>; isSecret?: boolean },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const userEmail = req.user?.email;

      const count = await this.envService.bulkSet(
        siteId,
        body.scope,
        body.vars,
        body.isSecret !== false,
        userId,
        userEmail,
        req,
      );

      return {
        success: true,
        message: `Imported ${count} environment variables`,
        count,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to bulk import environment variables',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Delete all environment variables for a scope
   * DELETE /v1/sites/:siteId/env/scope/:scope
   */
  @Delete('sites/:siteId/env/scope/:scope')
  async deleteScopeEnvVars(
    @Param('siteId') siteId: string,
    @Param('scope') scope: string,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const userEmail = req.user?.email;

      const count = await this.envService.deleteScope(
        siteId,
        scope,
        userId,
        userEmail,
        req,
      );

      return {
        success: true,
        message: `Deleted ${count} environment variables`,
        count,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete scope environment variables',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Export environment variables for a scope (decrypted)
   * GET /v1/sites/:siteId/env/export?scope=build
   */
  @Get('sites/:siteId/env/export')
  async exportEnvVars(
    @Param('siteId') siteId: string,
    @Query('scope') scope: string,
  ) {
    try {
      if (!scope) {
        throw new HttpException('Scope is required', HttpStatus.BAD_REQUEST);
      }

      const vars = await this.envService.exportForScope(siteId, scope);

      return vars;
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to export environment variables',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}

