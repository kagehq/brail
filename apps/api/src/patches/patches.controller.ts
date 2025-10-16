import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Patch as PatchMethod,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatchesService } from './patches.service';

@Controller('sites/:siteId/patch')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class PatchesController {
  constructor(private readonly patches: PatchesService) {}

  /**
   * Create a patch deploy
   * POST /v1/sites/:siteId/patch/deploy
   */
  @Post('deploy')
  async createPatchDeploy(@Param('siteId') siteId: string) {
    // Get active deploy ID
    const activeDeployId = await this.patches['getActiveDeployId'](siteId);
    
    // Create patch deploy
    const deploy = await this.patches['createPatchDeploy'](siteId, activeDeployId);
    
    const uploadEndpoint = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/v1/uploads`;
    
    return {
      deployId: deploy.id,
      uploadEndpoint,
    };
  }

  /**
   * Replace a single file
   * POST /v1/sites/:siteId/patch/file
   */
  @Post('file')
  async patchFile(
    @Param('siteId') siteId: string,
    @Body()
    body: {
      destPath: string;
      contentB64?: string;
      contentType?: string;
      activate?: boolean;
    },
  ) {
    if (!body.destPath) {
      throw new BadRequestException('destPath is required');
    }

    // Decode content
    let content: Buffer;
    if (body.contentB64) {
      content = Buffer.from(body.contentB64, 'base64');
    } else {
      throw new BadRequestException('contentB64 is required');
    }

    // Replace file
    const result = await this.patches.replaceFile(
      siteId,
      body.destPath,
      content,
      body.contentType,
    );

    // Finalize
    await this.patches.finalize(result.deployId);

    // Optionally activate
    if (body.activate) {
      await this.patches.activate(result.deployId);
    }

    return result;
  }

  /**
   * Delete paths
   * POST /v1/sites/:siteId/patch/delete
   */
  @Post('delete')
  async deletePaths(
    @Param('siteId') siteId: string,
    @Body() body: { paths: string[]; activate?: boolean },
  ) {
    if (!body.paths || !Array.isArray(body.paths)) {
      throw new BadRequestException('paths array is required');
    }

    // Delete paths
    const result = await this.patches.deletePaths(siteId, body.paths);

    // Finalize
    await this.patches.finalize(result.deployId);

    // Optionally activate
    if (body.activate) {
      await this.patches.activate(result.deployId);
    }

    return result;
  }

  /**
   * Finalize patch deploy
   * PATCH /v1/sites/:siteId/patch/deploy/:deployId/finalize
   */
  @PatchMethod('deploy/:deployId/finalize')
  async finalizePatch(@Param('deployId') deployId: string) {
    return this.patches.finalize(deployId);
  }

  /**
   * Activate patch deploy
   * POST /v1/sites/:siteId/patch/deploy/:deployId/activate
   */
  @Post('deploy/:deployId/activate')
  async activatePatch(@Param('deployId') deployId: string) {
    return this.patches.activate(deployId);
  }
}

