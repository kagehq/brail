import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new build log entry
   */
  async create(data: CreateBuildLogDto) {
    return this.prisma.buildLog.create({
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
  }

  /**
   * Update a build log entry
   */
  async update(id: string, data: UpdateBuildLogDto) {
    return this.prisma.buildLog.update({
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

