import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SitesService } from '../sites/sites.service';
import { LogsService } from '../logs/logs.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DeploysService {
  private readonly logger = new Logger(DeploysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly sites: SitesService,
    @Inject(forwardRef(() => LogsService))
    private readonly logsService: LogsService,
    private readonly notifications: NotificationsGateway,
    private readonly audit: AuditService,
  ) {}

  async create(siteId: string, userId?: string, userEmail?: string, req?: any) {
    // Verify site exists
    const site = await this.sites.getById(siteId);

    const deploy = await this.prisma.deploy.create({
      data: {
        siteId,
        status: 'uploading',
        deployedBy: userId,
        deployedByEmail: userEmail,
      },
    });

    // Create initial log entry
    const deployLogger = this.logsService.createLogger(deploy.id);
    await deployLogger.info('Deployment created - ready for file upload');

    // Audit log
    await this.audit.record('deploy.created', {
      orgId: site.orgId,
      siteId,
      deployId: deploy.id,
      userId,
      userEmail,
      req,
    });

    const uploadEndpoint = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/v1/uploads`;

    return {
      deployId: deploy.id,
      uploadEndpoint,
    };
  }

  async getById(deployId: string) {
    const deploy = await this.prisma.deploy.findUnique({
      where: { id: deployId },
    });

    if (!deploy) {
      throw new NotFoundException('Deploy not found');
    }

    return deploy;
  }

  async finalize(deployId: string, comment?: string, req?: any) {
    const deploy = await this.getById(deployId);
    const site = await this.sites.getById(deploy.siteId);
    const deployLogger = this.logsService.createLogger(deployId);

    await deployLogger.info('Finalizing deployment...');
    
    if (comment) {
      await deployLogger.info(`Deployment note: ${comment}`);
    }

    // List all uploaded files for this deploy
    await deployLogger.info('Scanning uploaded files');
    const prefix = `deploys/${deployId}/`;
    const objects = await this.storage.listPrefix(prefix);

    // Build file index (excluding internal files)
    const fileIndex = objects
      .filter(obj => {
        const path = obj.key.replace(prefix, '');
        return path !== 'manifest.json' && path !== 'index.json';
      })
      .map(obj => {
        const path = `/${obj.key.replace(prefix, '')}`;
        return {
          path,
          size: obj.size,
          etag: '', // Will be populated if needed
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path));

    // Validation logs
    await deployLogger.info('Validating deployment...');
    
    // Check for index.html (required for static sites)
    const hasIndexHtml = fileIndex.some(f => f.path === '/index.html');
    if (hasIndexHtml) {
      await deployLogger.info('✓ Found index.html');
    } else {
      await deployLogger.warn('⚠ No index.html found - deployment may not be accessible');
    }

    // Detect framework/build tools
    const detectedFrameworks: string[] = [];
    const hasPackageJson = fileIndex.some(f => f.path === '/package.json');
    const hasTailwindConfig = fileIndex.some(f => f.path.includes('tailwind.config'));
    const hasNextConfig = fileIndex.some(f => f.path === '/next.config.js' || f.path === '/next.config.ts');
    const hasViteConfig = fileIndex.some(f => f.path === '/vite.config.js' || f.path === '/vite.config.ts');
    const hasNuxtConfig = fileIndex.some(f => f.path === '/nuxt.config.js' || f.path === '/nuxt.config.ts');
    
    if (hasPackageJson) detectedFrameworks.push('Node.js');
    if (hasTailwindConfig) detectedFrameworks.push('Tailwind CSS');
    if (hasNextConfig) detectedFrameworks.push('Next.js');
    if (hasViteConfig) detectedFrameworks.push('Vite');
    if (hasNuxtConfig) detectedFrameworks.push('Nuxt');
    
    if (detectedFrameworks.length > 0) {
      await deployLogger.info(`Detected: ${detectedFrameworks.join(', ')}`);
    } else {
      await deployLogger.info('Detected: Static HTML site');
    }

    // File type summary
    const extensions = fileIndex.map(f => {
      const ext = f.path.split('.').pop()?.toLowerCase() || 'no-ext';
      return ext;
    });
    const extCounts = extensions.reduce((acc, ext) => {
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topExt = Object.entries(extCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ext, count]) => `${count} ${ext}`)
      .join(', ');
    
    if (topExt) {
      await deployLogger.info(`File types: ${topExt}`);
    }

    // Write file index
    await deployLogger.info('Building file index');
    const indexKey = this.storage.getDeployIndexPath(deployId);
    await this.storage.putObjectJSON(indexKey, fileIndex);

    // Calculate totals
    const fileCount = fileIndex.length;
    const byteSize = fileIndex.reduce((sum, entry) => sum + entry.size, 0);

    this.logger.log(
      `Finalized deploy ${deployId}: ${fileCount} files, ${byteSize} bytes`,
    );

    await deployLogger.info(`Deployment finalized: ${fileCount} files (${(byteSize / 1024).toFixed(2)} KB)`);
    
    // Log upload summary
    await deployLogger.info(`✓ All files uploaded successfully`);

    // Check if build is needed
    if (hasPackageJson && !hasIndexHtml) {
      await deployLogger.warn('⚠ Build required: package.json detected but no index.html found');
      await deployLogger.info('Tip: Pre-build your site locally before deploying, or configure automatic builds');
    } else if (hasPackageJson && fileIndex.some(f => f.path.includes('node_modules'))) {
      await deployLogger.warn('⚠ node_modules detected - use .dropignore to exclude build artifacts');
    }

    // Update deploy
    const updated = await this.prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'uploaded',
        fileCount,
        byteSize: BigInt(byteSize),
        comment: comment || null,
      },
    });

    // Audit log
    await this.audit.record('deploy.finalized', {
      orgId: site.orgId,
      siteId: deploy.siteId,
      deployId,
      userId: deploy.deployedBy || undefined,
      userEmail: deploy.deployedByEmail || undefined,
      req,
      meta: { fileCount, byteSize },
    });

    // NOTE: Notification disabled to avoid duplicates with UI feedback
    // The DeployUploader component already shows success toasts
    // this.notifications.emitToSite(deploy.siteId, {
    //   id: `deploy-uploaded-${deployId}`,
    //   type: 'success',
    //   title: 'Upload Complete',
    //   message: `${fileCount} files uploaded successfully`,
    //   timestamp: new Date(),
    //   metadata: { deployId },
    // });

    return updated;
  }

  async activate(deployId: string, comment?: string, req?: any) {
    const deploy = await this.getById(deployId);
    const site = await this.sites.getById(deploy.siteId);
    const deployLogger = this.logsService.createLogger(deployId);

    if (deploy.status === 'uploading') {
      throw new Error('Deploy must be finalized before activation');
    }

    await deployLogger.info('Starting deployment activation...');
    
    if (comment) {
      await deployLogger.info(`Deployment note: ${comment}`);
    }

    // Show deployment info
    const sizeKB = (Number(deploy.byteSize) / 1024).toFixed(2);
    const sizeMB = (Number(deploy.byteSize) / (1024 * 1024)).toFixed(2);
    const displaySize = Number(sizeMB) >= 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
    await deployLogger.info(`Deployment size: ${deploy.fileCount} files (${displaySize})`);

    // Check if there's a currently active deployment
    const currentlyActive = await this.prisma.deploy.findFirst({
      where: {
        siteId: deploy.siteId,
        status: 'active',
      },
    });

    if (currentlyActive) {
      const currentSizeKB = (Number(currentlyActive.byteSize) / 1024).toFixed(2);
      const currentSizeMB = (Number(currentlyActive.byteSize) / (1024 * 1024)).toFixed(2);
      const currentDisplaySize = Number(currentSizeMB) >= 1 ? `${currentSizeMB} MB` : `${currentSizeKB} KB`;
      
      await deployLogger.info(`Replacing deployment ${currentlyActive.id.slice(0, 8)}... (${currentlyActive.fileCount} files, ${currentDisplaySize})`);
      
      // Show size comparison
      const sizeDiff = Number(deploy.byteSize) - Number(currentlyActive.byteSize);
      const fileDiff = deploy.fileCount - currentlyActive.fileCount;
      
      if (sizeDiff > 0) {
        const diffKB = (sizeDiff / 1024).toFixed(2);
        const diffMB = (sizeDiff / (1024 * 1024)).toFixed(2);
        const diffDisplay = Number(diffMB) >= 1 ? `${diffMB} MB` : `${diffKB} KB`;
        await deployLogger.info(`Size change: +${diffDisplay}`);
      } else if (sizeDiff < 0) {
        const diffKB = (Math.abs(sizeDiff) / 1024).toFixed(2);
        const diffMB = (Math.abs(sizeDiff) / (1024 * 1024)).toFixed(2);
        const diffDisplay = Number(diffMB) >= 1 ? `${diffMB} MB` : `${diffKB} KB`;
        await deployLogger.info(`Size change: -${diffDisplay}`);
      }
      
      if (fileDiff > 0) {
        await deployLogger.info(`File change: +${fileDiff} files`);
      } else if (fileDiff < 0) {
        await deployLogger.info(`File change: ${fileDiff} files`);
      }
    } else {
      await deployLogger.info('First deployment for this site');
    }

    // Write current.json to point to this deploy
    await deployLogger.info('Updating current deployment pointer');
    const currentPath = this.storage.getSiteCurrentPath(deploy.siteId);
    await this.storage.putObjectJSON(currentPath, {
      deployId: deploy.id,
      activatedAt: new Date().toISOString(),
    });

    // Deactivate other deploys for this site
    await deployLogger.info('Deactivating previous deployments');
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
    await deployLogger.info('Activating deployment');
    
    // Calculate duration from creation to activation
    const duration = Date.now() - new Date(deploy.createdAt).getTime();
    
    const updated = await this.prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'active',
        // Only update comment if provided, otherwise keep existing
        ...(comment !== undefined && { comment: comment || null }),
        duration,
      },
    });

    // Update site's activeDeployId
    await this.sites.updateActiveDeploy(deploy.siteId, deploy.id);

    // Audit log
    await this.audit.record('deploy.activated', {
      orgId: site.orgId,
      siteId: deploy.siteId,
      deployId,
      userId: deploy.deployedBy || undefined,
      userEmail: deploy.deployedByEmail || undefined,
      req,
      meta: { adapter: 'brail' },
    });

    // NOTE: Notification disabled to avoid duplicates with UI feedback
    // The UI components already show success toasts when activating
    // this.notifications.emitToSite(deploy.siteId, {
    //   id: `deploy-activated-${deployId}`,
    //   type: 'success',
    //   title: 'Deployment Activated!',
    //   message: 'Your site is now live',
    //   timestamp: new Date(),
    //   metadata: { deployId },
    // });

    const publicUrl = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/public/${deploy.siteId}/`;

    // Show timing information
    const totalDuration = Date.now() - new Date(deploy.createdAt).getTime();
    const minutes = Math.floor(totalDuration / 60000);
    const seconds = ((totalDuration % 60000) / 1000).toFixed(1);
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    this.logger.log(`Activated deploy ${deployId} for site ${deploy.siteId}`);
    await deployLogger.info(`Deployment activated successfully!`, { publicUrl });
    await deployLogger.info(`Total deployment time: ${timeDisplay}`);

    // TODO: Purge CDN cache (stub)
    await deployLogger.info('Purging CDN cache...');
    this.purgeCDN(deploy.siteId);
    await deployLogger.info('CDN cache purged');

    return {
      success: true,
      deploy: updated,
      publicUrl,
    };
  }

  async delete(deployId: string, req?: any) {
    const deploy = await this.getById(deployId);
    const site = await this.sites.getById(deploy.siteId);

    // Check if it's the active deploy
    if (deploy.status === 'active') {
      throw new Error('Cannot delete active deployment. Please activate another deployment first.');
    }

    // Delete the deploy record
    await this.prisma.deploy.delete({
      where: { id: deployId },
    });

    // Audit log
    await this.audit.record('deploy.deleted', {
      orgId: site.orgId,
      siteId: deploy.siteId,
      deployId,
      userId: deploy.deployedBy || undefined,
      userEmail: deploy.deployedByEmail || undefined,
      req,
    });

    this.logger.log(`Deleted deploy ${deployId}`);

    return { success: true, message: 'Deployment deleted successfully' };
  }

  async markAsFailed(deployId: string, reason?: string) {
    const deploy = await this.getById(deployId);
    const deployLogger = this.logsService.createLogger(deployId);

    await deployLogger.error(`Deployment failed: ${reason || 'Unknown error'}`);

    // Update deploy status to failed
    const updated = await this.prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'failed',
      },
    });

    // Send notification
    this.notifications.emitToSite(deploy.siteId, {
      id: `deploy-failed-${deployId}`,
      type: 'error',
      title: 'Deployment Failed',
      message: reason || 'Upload failed',
      timestamp: new Date(),
      metadata: { deployId },
    });

    this.logger.log(`Marked deploy ${deployId} as failed`);

    return updated;
  }

  private purgeCDN(siteId: string) {
    // Stub for future CDN purge implementation
    this.logger.debug(`CDN purge stub called for site ${siteId}`);
  }
}

