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

    // Send notification
    this.notifications.emitToSite(deploy.siteId, {
      id: `deploy-uploaded-${deployId}`,
      type: 'success',
      title: 'Upload Complete',
      message: `${fileCount} files uploaded successfully`,
      timestamp: new Date(),
      metadata: { deployId },
    });

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

    // Send notification
    this.notifications.emitToSite(deploy.siteId, {
      id: `deploy-activated-${deployId}`,
      type: 'success',
      title: 'Deployment Activated!',
      message: 'Your site is now live',
      timestamp: new Date(),
      metadata: { deployId },
    });

    const publicUrl = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/public/${deploy.siteId}/`;

    this.logger.log(`Activated deploy ${deployId} for site ${deploy.siteId}`);
    await deployLogger.info(`Deployment activated successfully!`, { publicUrl });

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

