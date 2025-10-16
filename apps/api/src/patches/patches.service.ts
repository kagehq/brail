import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SitesService } from '../sites/sites.service';
import * as path from 'path';

export interface PatchManifest {
  baseDeployId: string;
  overrides: string[];
  deletes: string[];
}

export interface FileIndexEntry {
  path: string;
  size: number;
  etag: string;
}

@Injectable()
export class PatchesService {
  private readonly logger = new Logger(PatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly sites: SitesService,
  ) {}

  /**
   * Normalize and validate a path for security
   */
  private normalizePath(inputPath: string): string {
    // Ensure leading slash
    let normalized = inputPath.startsWith('/') ? inputPath : `/${inputPath}`;
    
    // Normalize to remove .. and .
    normalized = path.posix.normalize(normalized);
    
    // Reject if it still contains .. (security)
    if (normalized.includes('..')) {
      throw new BadRequestException('Invalid path: contains ..');
    }
    
    return normalized;
  }

  /**
   * Get the active deploy for a site
   */
  private async getActiveDeployId(siteId: string): Promise<string> {
    const site = await this.sites.getById(siteId);
    
    if (!site.activeDeployId) {
      throw new BadRequestException('Site has no active deployment');
    }
    
    return site.activeDeployId;
  }

  /**
   * Create a new patch deploy
   */
  async createPatchDeploy(siteId: string, baseDeployId: string) {
    // Verify base deploy exists
    const baseDeploy = await this.prisma.deploy.findUnique({
      where: { id: baseDeployId },
    });

    if (!baseDeploy) {
      throw new NotFoundException('Base deploy not found');
    }

    // Create new deploy marked as patch
    const newDeploy = await this.prisma.deploy.create({
      data: {
        siteId,
        status: 'uploading',
        isPatch: true,
        baseDeployId,
      },
    });

    return newDeploy;
  }

  /**
   * Replace a single file in a patch deploy
   */
  async replaceFile(
    siteId: string,
    destPath: string,
    content: Buffer,
    contentType?: string,
  ) {
    // Normalize path
    const normalizedPath = this.normalizePath(destPath);

    // Get active deploy
    const baseDeployId = await this.getActiveDeployId(siteId);

    // Create patch deploy
    const newDeploy = await this.createPatchDeploy(siteId, baseDeployId);

    // Upload file
    const fileKey = this.storage.getDeployPath(newDeploy.id, normalizedPath);
    await this.storage.putObject(fileKey, content, contentType, { immutable: true });

    this.logger.log(`Replaced file ${normalizedPath} in patch deploy ${newDeploy.id}`);

    return {
      deployId: newDeploy.id,
      baseDeployId,
      path: normalizedPath,
    };
  }

  /**
   * Delete paths in a patch deploy
   */
  async deletePaths(siteId: string, paths: string[]) {
    // Normalize paths
    const normalizedPaths = paths.map(p => this.normalizePath(p));

    // Get active deploy
    const baseDeployId = await this.getActiveDeployId(siteId);

    // Create patch deploy
    const newDeploy = await this.createPatchDeploy(siteId, baseDeployId);

    // Write manifest with deletes
    const manifest: PatchManifest = {
      baseDeployId,
      overrides: [],
      deletes: normalizedPaths,
    };

    const manifestKey = this.storage.getDeployManifestPath(newDeploy.id);
    await this.storage.putObjectJSON(manifestKey, manifest);

    this.logger.log(`Deleted ${paths.length} paths in patch deploy ${newDeploy.id}`);

    return {
      deployId: newDeploy.id,
      baseDeployId,
      deletedPaths: normalizedPaths,
    };
  }

  /**
   * Finalize a patch deploy
   */
  async finalize(deployId: string) {
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: deployId },
    });

    if (!deploy) {
      throw new NotFoundException('Deploy not found');
    }

    if (!deploy.isPatch) {
      throw new BadRequestException('Deploy is not a patch deploy');
    }

    if (!deploy.baseDeployId) {
      throw new BadRequestException('Patch deploy missing baseDeployId');
    }

    // List files in this patch deploy
    const prefix = `deploys/${deployId}/`;
    const patchObjects = await this.storage.listPrefix(prefix);

    // Extract overridden paths (excluding manifest.json and index.json)
    const overrides = patchObjects
      .map(obj => obj.key.replace(prefix, ''))
      .filter(path => path !== 'manifest.json' && path !== 'index.json')
      .map(path => `/${path}`);

    // Load or create manifest
    let manifest: PatchManifest;
    const manifestKey = this.storage.getDeployManifestPath(deployId);
    
    try {
      manifest = await this.storage.getObjectJSON<PatchManifest>(manifestKey);
      // Add overrides from uploaded files
      manifest.overrides = [...new Set([...manifest.overrides, ...overrides])];
    } catch {
      // No manifest yet, create one
      manifest = {
        baseDeployId: deploy.baseDeployId,
        overrides,
        deletes: [],
      };
    }

    // Write updated manifest
    await this.storage.putObjectJSON(manifestKey, manifest);

    // Build file index by merging base index with overrides
    const baseIndexKey = this.storage.getDeployIndexPath(deploy.baseDeployId);
    let baseIndex: FileIndexEntry[] = [];
    
    try {
      baseIndex = await this.storage.getObjectJSON<FileIndexEntry[]>(baseIndexKey);
    } catch {
      this.logger.warn(`Base deploy ${deploy.baseDeployId} has no index, starting fresh`);
    }

    // Create merged index
    const indexMap = new Map<string, FileIndexEntry>();
    
    // Start with base index
    for (const entry of baseIndex) {
      indexMap.set(entry.path, entry);
    }

    // Remove deleted paths
    for (const deletedPath of manifest.deletes) {
      indexMap.delete(deletedPath);
    }

    // Add/update overridden paths
    for (const overridePath of manifest.overrides) {
      const fileKey = this.storage.getDeployPath(deployId, overridePath);
      try {
        const metadata = await this.storage.headObject(fileKey);
        indexMap.set(overridePath, {
          path: overridePath,
          size: metadata.contentLength || 0,
          etag: metadata.etag || '',
        });
      } catch (error) {
        this.logger.warn(`Failed to get metadata for ${overridePath}: ${error.message}`);
      }
    }

    // Write index
    const newIndex = Array.from(indexMap.values()).sort((a, b) => a.path.localeCompare(b.path));
    const indexKey = this.storage.getDeployIndexPath(deployId);
    await this.storage.putObjectJSON(indexKey, newIndex);

    // Calculate totals
    const fileCount = newIndex.length;
    const byteSize = newIndex.reduce((sum, entry) => sum + entry.size, 0);

    // Update deploy
    const updated = await this.prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'uploaded',
        fileCount,
        byteSize: BigInt(byteSize),
      },
    });

    // Create patch record
    await this.prisma.patch.create({
      data: {
        siteId: deploy.siteId,
        baseDeployId: deploy.baseDeployId,
        newDeployId: deployId,
        summary: {
          added: manifest.overrides.filter(p => !baseIndex.find(e => e.path === p)),
          replaced: manifest.overrides.filter(p => baseIndex.find(e => e.path === p)),
          deleted: manifest.deletes,
        },
      },
    });

    this.logger.log(`Finalized patch deploy ${deployId}: ${fileCount} files, ${byteSize} bytes`);

    return {
      deploy: updated,
      manifest,
      fileCount,
      byteSize,
    };
  }

  /**
   * Activate a patch deploy
   */
  async activate(deployId: string) {
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: deployId },
    });

    if (!deploy) {
      throw new NotFoundException('Deploy not found');
    }

    if (deploy.status === 'uploading') {
      throw new BadRequestException('Deploy must be finalized before activation');
    }

    // Write current.json
    const currentPath = this.storage.getSiteCurrentPath(deploy.siteId);
    await this.storage.putObjectJSON(currentPath, {
      deployId: deploy.id,
      activatedAt: new Date().toISOString(),
    });

    // Deactivate other deploys
    await this.prisma.deploy.updateMany({
      where: {
        siteId: deploy.siteId,
        status: 'active',
      },
      data: {
        status: 'uploaded',
      },
    });

    // Activate this deploy
    const updated = await this.prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'active',
      },
    });

    // Update site's activeDeployId
    await this.sites.updateActiveDeploy(deploy.siteId, deploy.id);

    const publicUrl = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/public/${deploy.siteId}/`;

    this.logger.log(`Activated ${deploy.isPatch ? 'patch' : ''} deploy ${deployId} for site ${deploy.siteId}`);

    return {
      success: true,
      deploy: updated,
      publicUrl,
    };
  }

  /**
   * Get file tree for a site (from active deploy)
   */
  async getFileTree(siteId: string) {
    const site = await this.sites.getById(siteId);
    
    if (!site.activeDeployId) {
      return { files: [] };
    }

    // Load index
    const indexKey = this.storage.getDeployIndexPath(site.activeDeployId);
    
    try {
      const index = await this.storage.getObjectJSON<FileIndexEntry[]>(indexKey);
      return { files: index };
    } catch {
      // No index, return empty
      return { files: [] };
    }
  }
}

