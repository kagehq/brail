/**
 * Anonymize IP address using SHA-256 hash (first 16 chars)
 */
export declare function anonymizeIp(ip: string): string;
/**
 * Anonymize User Agent using SHA-256 hash (first 16 chars)
 */
export declare function anonymizeUA(ua: string): string;
/**
 * Audit action types
 */
export type AuditAction = 'deploy.created' | 'deploy.finalized' | 'deploy.activated' | 'deploy.rollback' | 'deploy.deleted' | 'site.created' | 'site.deleted' | 'user.login' | 'token.created' | 'token.deleted' | 'profile.created' | 'profile.updated' | 'profile.deleted' | 'release.promoted' | 'release.rolled_back' | 'build.started' | 'build.completed' | 'build.failed' | 'env.set' | 'env.deleted' | 'env.scope_deleted';
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
