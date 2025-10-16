import { createHash } from 'crypto';

/**
 * Anonymize IP address using SHA-256 hash (first 16 chars)
 */
export function anonymizeIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Anonymize User Agent using SHA-256 hash (first 16 chars)
 */
export function anonymizeUA(ua: string): string {
  return createHash('sha256').update(ua).digest('hex').slice(0, 16);
}

/**
 * Audit action types
 */
export type AuditAction =
  | 'deploy.created'
  | 'deploy.finalized'
  | 'deploy.activated'
  | 'deploy.rollback'
  | 'deploy.deleted'
  | 'site.created'
  | 'site.deleted'
  | 'user.login'
  | 'token.created'
  | 'token.deleted'
  | 'profile.created'
  | 'profile.updated'
  | 'profile.deleted'
  | 'release.promoted'
  | 'release.rolled_back'
  | 'build.started'
  | 'build.completed'
  | 'build.failed';

/**
 * Audit event interface
 */
export interface AuditEvent {
  id: string;
  orgId: string;
  siteId: string;
  deployId?: string | null;
  userId?: string | null;
  action: string;
  ipHash?: string | null;
  userAgent?: string | null;
  country?: string | null;
  meta?: any;
  createdAt: Date | string;
}

