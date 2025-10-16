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
import { getMimeType, matchPath } from '@br/shared';

interface CurrentDeploy {
  deployId: string;
  activatedAt: string;
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
  async serve(
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Extract path
      const fullPath = res.req.path;
      const pathMatch = fullPath.match(/^\/public\/[^/]+\/(.*)$/);
      let requestPath = pathMatch ? pathMatch[1] : '';

      // Normalize path
      requestPath = requestPath.replace(/^\/+/, '');

      // Get current deploy for site
      const currentPath = this.storage.getSiteCurrentPath(siteId);
      const current = await this.storage.getObjectJSON<CurrentDeploy>(
        currentPath,
      );

      if (!current || !current.deployId) {
        throw new NotFoundException('No active deploy for this site');
      }

      const deployId = current.deployId;

      // Check if this is a patch deploy by looking for manifest
      let manifest: PatchManifest | null = null;
      try {
        const manifestPath = this.storage.getDeployManifestPath(deployId);
        manifest = await this.storage.getObjectJSON<PatchManifest>(manifestPath);
      } catch (error) {
        // Not a patch deploy or no manifest
      }

      // Try to load _drop.json config (check both patch and base if applicable)
      let dropConfig: DropConfig | null = null;
      try {
        const dropPath = this.storage.getDeployPath(deployId, '_drop.json');
        dropConfig = await this.storage.getObjectJSON<DropConfig>(dropPath);
      } catch (error) {
        // Try base deploy if this is a patch
        if (manifest?.baseDeployId) {
          try {
            const baseDropPath = this.storage.getDeployPath(manifest.baseDeployId, '_drop.json');
            dropConfig = await this.storage.getObjectJSON<DropConfig>(baseDropPath);
          } catch {
            // No _drop.json in base either
          }
        }
      }

      // Apply redirects
      if (dropConfig?.redirects) {
        for (const redirect of dropConfig.redirects) {
          if (matchPath(redirect.from, `/${requestPath}`)) {
            this.logger.debug(
              `Redirect: ${requestPath} -> ${redirect.to} (${redirect.status})`,
            );
            res.redirect(redirect.status || 301, redirect.to);
            return;
          }
        }
      }

      // Default to index.html if path is empty or ends with /
      if (!requestPath || requestPath.endsWith('/')) {
        requestPath = `${requestPath}index.html`;
      }

      // Normalize to leading slash for manifest checks
      const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;

      // If manifest exists, check for deletes and overrides
      let actualDeployId = deployId;
      
      if (manifest) {
        // Check if path is deleted
        if (manifest.deletes.includes(normalizedPath)) {
          throw new NotFoundException('File was deleted in this patch');
        }

        // Check if path is overridden in patch
        if (manifest.overrides.includes(normalizedPath)) {
          actualDeployId = deployId; // Use patch deploy
        } else {
          actualDeployId = manifest.baseDeployId; // Fallback to base
        }
      }

      // Get file from storage
      let filePath = this.storage.getDeployPath(actualDeployId, requestPath);

      // Check if file exists
      let exists = await this.storage.exists(filePath);
      
      if (!exists) {
        // Try adding .html extension (for clean URLs)
        const htmlPath = this.storage.getDeployPath(
          actualDeployId,
          `${requestPath}.html`,
        );
        const htmlExists = await this.storage.exists(htmlPath);

        if (!htmlExists) {
          throw new NotFoundException('File not found');
        }

        // Use the .html version
        requestPath = `${requestPath}.html`;
        filePath = htmlPath;
      }

      // Get file metadata and stream
      const fileKey = this.storage.getDeployPath(actualDeployId, requestPath);
      const metadata = await this.storage.headObject(fileKey);
      const stream = await this.storage.getObjectStream(fileKey);

      // Determine content type - always use file extension to avoid wrong S3 metadata
      const contentType = getMimeType(requestPath);

      // Apply custom headers from _drop.json
      if (dropConfig?.headers) {
        for (const headerRule of dropConfig.headers) {
          if (matchPath(headerRule.path, `/${requestPath}`)) {
            for (const [key, value] of Object.entries(headerRule.set)) {
              res.setHeader(key, value);
            }
          }
        }
      }

      // Set response headers
      res.setHeader('Content-Type', contentType);
      if (metadata.contentLength) {
        res.setHeader('Content-Length', metadata.contentLength);
      }
      if (metadata.etag) {
        res.setHeader('ETag', metadata.etag);
      }

      // Set cache headers (immutable for deploys)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      // Stream file
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Error serving ${siteId}: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }
}

