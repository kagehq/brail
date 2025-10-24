import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { matchPath } from '@br/shared';

interface CurrentDeploy {
  deployId: string;
}

interface DropConfig {
  headers?: Array<{
    path: string;
    set: Record<string, string>;
  }>;
  redirects?: Array<{
    from: string;
    to: string;
    status: number;
  }>;
}

interface PatchManifest {
  baseDeployId: string;
  overrides: string[];
  deletes: string[];
}

@Controller('public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(private readonly storage: StorageService) {}

  @Get(':siteId/*')
  async serveSite(
    @Param('siteId') siteId: string,
    @Param('0') requestedPath: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 1. Get current deploy for site
      const current = await this.storage
        .getObjectJSON<CurrentDeploy>(`sites/${siteId}/current.json`)
        .catch(() => {
          throw new NotFoundException('Site configuration not found');
        });

      if (!current?.deployId) {
        throw new NotFoundException('No active deployment for this site');
      }

      const { deployId } = current;

      // 2. Load manifest and dropConfig to determine deployment rules
      const manifest = await this.storage
        .getObjectJSON<PatchManifest>(`deployments/${deployId}/_manifest.json`)
        .catch(() => null);

      const dropConfig = await this.storage
        .getObjectJSON<DropConfig>(`deployments/${deployId}/_drop.json`)
        .catch(() => {
          // If it's a patch deploy, try the base deploy's config as a fallback
          if (manifest?.baseDeployId) {
            return this.storage.getObjectJSON<DropConfig>(
              `deployments/${manifest.baseDeployId}/_drop.json`,
            );
          }
          return null;
        })
        .catch(() => null);

      let filePath = requestedPath || '';

      // 3. Apply redirects from _drop.json
      if (dropConfig?.redirects) {
        for (const redirect of dropConfig.redirects) {
          if (matchPath(redirect.from, `/${filePath}`)) {
            this.logger.debug(
              `Redirecting "${filePath}" to "${redirect.to}" for site "${siteId}"`,
            );
            return res.redirect(redirect.status || 301, redirect.to);
          }
        }
      }

      // 4. Default to index.html for root or directory requests
      if (filePath === '' || filePath.endsWith('/')) {
        filePath = `${filePath}index.html`;
      }

      // 5. Determine the actual deployment to serve from (patch vs. base)
      let actualDeployId = deployId;
      if (manifest) {
        const normalizedPath = `/${filePath}`;
        if (manifest.deletes.includes(normalizedPath)) {
          throw new NotFoundException('File deleted in this deployment patch');
        }
        if (!manifest.overrides.includes(normalizedPath)) {
          actualDeployId = manifest.baseDeployId;
        }
      }

      // 6. Apply custom headers from _drop.json
      if (dropConfig?.headers) {
        for (const headerRule of dropConfig.headers) {
          if (matchPath(headerRule.path, `/${filePath}`)) {
            for (const [key, value] of Object.entries(headerRule.set)) {
              res.setHeader(key, value);
            }
          }
        }
      }

      // 7. Get file stream, handling clean URL (.html) fallbacks
      let fileData;
      try {
        fileData = await this.storage.getFileStream(actualDeployId, filePath);
      } catch (error) {
        if (error instanceof NotFoundException && !filePath.endsWith('.html')) {
          try {
            fileData = await this.storage.getFileStream(
              actualDeployId,
              `${filePath}.html`,
            );
          } catch (htmlError) {
            throw new NotFoundException('File not found');
          }
        } else {
          throw error;
        }
      }

      const { stream, contentType } = fileData;

      // 8. Set final headers and stream response
      res.setHeader('Content-Type', contentType);
      if (!res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }

      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.debug(
          `Not found for site "${siteId}" path "${requestedPath}": ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `Error serving path "${requestedPath}" for site "${siteId}": ${error.message}`,
        error.stack,
      );
      throw new NotFoundException('Deployment or file not found');
    }
  }
}