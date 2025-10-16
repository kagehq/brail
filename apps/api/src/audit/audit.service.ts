import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { anonymizeIp, anonymizeUA, type AuditAction } from '@br/shared/src/audit.js';
import type { Request } from 'express';

export interface RecordAuditInput {
  orgId: string;
  siteId: string;
  deployId?: string;
  userId?: string;
  userEmail?: string;
  req?: Request;
  meta?: any;
}

export interface ListAuditParams {
  siteId: string;
  from?: Date;
  to?: Date;
  action?: string;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit event
   */
  async record(action: AuditAction, data: RecordAuditInput): Promise<void> {
    const ip = data.req?.headers['x-forwarded-for'] || data.req?.socket?.remoteAddress;
    const ua = data.req?.headers['user-agent'];
    const country = data.req?.headers['cf-ipcountry'] as string | undefined;

    await this.prisma.auditEvent.create({
      data: {
        orgId: data.orgId,
        siteId: data.siteId,
        deployId: data.deployId || null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action,
        ipHash: ip ? anonymizeIp(ip.toString()) : null,
        userAgent: ua ? anonymizeUA(ua) : null,
        country: country || null,
        meta: data.meta || {},
      },
    });
  }

  /**
   * List audit events for a site
   */
  async list(params: ListAuditParams) {
    return this.prisma.auditEvent.findMany({
      where: {
        siteId: params.siteId,
        createdAt: {
          gte: params.from,
          lte: params.to,
        },
        ...(params.action && { action: params.action }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 500,
    });
  }

  /**
   * Get audit statistics for a site
   */
  async getStats(siteId: string, days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const events = await this.prisma.auditEvent.findMany({
      where: {
        siteId,
        createdAt: { gte: from },
      },
      select: {
        action: true,
        createdAt: true,
      },
    });

    // Count by action
    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const event of events) {
      // By action
      byAction[event.action] = (byAction[event.action] || 0) + 1;

      // By day
      const day = event.createdAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return {
      total: events.length,
      byAction,
      byDay,
    };
  }
}

