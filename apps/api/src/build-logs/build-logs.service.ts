import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Request } from 'express';

export interface CreateBuildLogDto {
  siteId: string;
  deployId?: string;
  framework: string;
  command: string;
  status?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
  warnings?: any[];
  nodeVersion?: string;
  packageManager?: string;
  cacheHit?: boolean;
  outputDir?: string;
  userId?: string;
  userEmail?: string;
  req?: Request;
}

export interface UpdateBuildLogDto {
  status?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
  warnings?: any[];
  completedAt?: Date;
}

@Injectable()
export class BuildLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new build log entry
   */
  async create(data: CreateBuildLogDto) {
    const buildLog = await this.prisma.buildLog.create({
      data: {
        siteId: data.siteId,
        deployId: data.deployId,
        framework: data.framework,
        command: data.command,
        status: data.status || 'running',
        exitCode: data.exitCode,
        stdout: data.stdout || '',
        stderr: data.stderr,
        duration: data.duration,
        warnings: data.warnings ? JSON.parse(JSON.stringify(data.warnings)) : undefined,
        nodeVersion: data.nodeVersion,
        packageManager: data.packageManager,
        cacheHit: data.cacheHit || false,
        outputDir: data.outputDir,
      },
    });

    // Get site to fetch orgId for audit
    const site = await this.prisma.site.findUnique({
      where: { id: data.siteId },
      select: { orgId: true },
    });

    // Record audit event for build started
    if (site) {
      await this.audit.record('build.started', {
        orgId: site.orgId,
        siteId: data.siteId,
        deployId: data.deployId,
        userId: data.userId,
        userEmail: data.userEmail,
        req: data.req,
        meta: {
          framework: data.framework,
          command: data.command,
          nodeVersion: data.nodeVersion,
          packageManager: data.packageManager,
          cacheHit: data.cacheHit,
        },
      });
    }

    return buildLog;
  }

  /**
   * Update a build log entry
   */
  async update(id: string, data: UpdateBuildLogDto) {
    const buildLog = await this.prisma.buildLog.update({
      where: { id },
      data: {
        status: data.status,
        exitCode: data.exitCode,
        stdout: data.stdout,
        stderr: data.stderr,
        duration: data.duration,
        warnings: data.warnings ? JSON.parse(JSON.stringify(data.warnings)) : undefined,
        completedAt: data.completedAt,
      },
    });

    // Get site to fetch orgId for audit
    const site = await this.prisma.site.findUnique({
      where: { id: buildLog.siteId },
      select: { orgId: true },
    });

    // Record audit event for build completion or failure
    if (site && data.status) {
      if (data.status === 'success') {
        await this.audit.record('build.completed', {
          orgId: site.orgId,
          siteId: buildLog.siteId,
          deployId: buildLog.deployId || undefined,
          meta: {
            framework: buildLog.framework,
            exitCode: data.exitCode,
            duration: data.duration,
            outputDir: buildLog.outputDir,
          },
        });
      } else if (data.status === 'failed') {
        await this.audit.record('build.failed', {
          orgId: site.orgId,
          siteId: buildLog.siteId,
          deployId: buildLog.deployId || undefined,
          meta: {
            framework: buildLog.framework,
            exitCode: data.exitCode,
            duration: data.duration,
          },
        });
      }
    }

    return buildLog;
  }

  /**
   * Get a build log by ID
   */
  async findOne(id: string) {
    const log = await this.prisma.buildLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException('Build log not found');
    }

    return log;
  }

  /**
   * List build logs for a site
   */
  async findBySite(siteId: string, limit = 50) {
    return this.prisma.buildLog.findMany({
      where: { siteId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get build log for a deploy
   */
  async findByDeploy(deployId: string) {
    return this.prisma.buildLog.findFirst({
      where: { deployId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Delete a build log
   */
  async delete(id: string) {
    return this.prisma.buildLog.delete({
      where: { id },
    });
  }
}

