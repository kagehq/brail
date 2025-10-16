import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsGateway } from './logs.gateway';

export interface CreateLogInput {
  deployId: string;
  level: 'info' | 'error' | 'debug' | 'warn';
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class LogsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LogsGateway))
    private readonly logsGateway: LogsGateway,
  ) {}

  async create(input: CreateLogInput) {
    const log = await this.prisma.deploymentLog.create({
      data: {
        deployId: input.deployId,
        level: input.level,
        message: input.message,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    // Emit the log via WebSocket
    this.logsGateway.emitLog(input.deployId, {
      id: log.id,
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
      metadata: input.metadata,
    });

    return log;
  }

  async createMany(logs: CreateLogInput[]) {
    return this.prisma.deploymentLog.createMany({
      data: logs.map((log) => ({
        deployId: log.deployId,
        level: log.level,
        message: log.message,
        metadata: log.metadata ? JSON.stringify(log.metadata) : null,
      })),
    });
  }

  async getByDeployId(deployId: string) {
    const logs = await this.prisma.deploymentLog.findMany({
      where: { deployId },
      orderBy: { timestamp: 'asc' },
    });

    return logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }

  async getLatest(deployId: string, limit: number = 100) {
    const logs = await this.prisma.deploymentLog.findMany({
      where: { deployId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs
      .reverse()
      .map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
  }

  async deleteByDeployId(deployId: string) {
    return this.prisma.deploymentLog.deleteMany({
      where: { deployId },
    });
  }

  // Helper method to create a logger for a specific deploy
  createLogger(deployId: string) {
    return {
      info: (message: string, metadata?: Record<string, any>) =>
        this.create({ deployId, level: 'info', message, metadata }),
      error: (message: string, metadata?: Record<string, any>) =>
        this.create({ deployId, level: 'error', message, metadata }),
      debug: (message: string, metadata?: Record<string, any>) =>
        this.create({ deployId, level: 'debug', message, metadata }),
      warn: (message: string, metadata?: Record<string, any>) =>
        this.create({ deployId, level: 'warn', message, metadata }),
    };
  }
}

