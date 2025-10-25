"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptedBlobSchema = exports.RollbackRequestSchema = exports.ActivateDeployRequestSchema = exports.StageDeployRequestSchema = exports.ListReleasesResponseSchema = exports.ReleaseSchema = exports.ReleaseStatusSchema = exports.ConnectionProfileWithConfigSchema = exports.ConnectionProfileSchema = exports.UpdateProfileRequestSchema = exports.CreateProfileRequestSchema = exports.FlyConfigSchema = exports.RailwayConfigSchema = exports.CloudflarePagesConfigSchema = exports.VercelConfigSchema = exports.S3ConfigSchema = exports.SshRsyncConfigSchema = exports.SshHealthConfigSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// SSH+rsync Adapter Config
// ============================================================================
exports.SshHealthConfigSchema = zod_1.z.object({
    mode: zod_1.z.enum(['url', 'canary']),
    url: zod_1.z.string().url().optional(),
    canaryPath: zod_1.z.string().url().optional(),
    timeoutMs: zod_1.z.number().int().positive().default(8000),
    retries: zod_1.z.number().int().positive().default(5),
});
exports.SshRsyncConfigSchema = zod_1.z.object({
    host: zod_1.z.string().min(1),
    port: zod_1.z.number().int().positive().default(22),
    user: zod_1.z.string().min(1),
    privateKey: zod_1.z.string().min(1), // PEM format or file path
    basePath: zod_1.z.string().min(1),
    keepReleases: zod_1.z.number().int().positive().default(5),
    health: exports.SshHealthConfigSchema.optional(),
});
// ============================================================================
// S3 Adapter Config
// ============================================================================
exports.S3ConfigSchema = zod_1.z.object({
    endpoint: zod_1.z.string().url().optional(),
    region: zod_1.z.string().min(1),
    bucket: zod_1.z.string().min(1),
    prefix: zod_1.z.string().min(1),
    accessKeyId: zod_1.z.string().min(1),
    secretAccessKey: zod_1.z.string().min(1),
    forcePathStyle: zod_1.z.boolean().default(false),
    keepReleases: zod_1.z.number().int().positive().default(5),
});
// ============================================================================
// Vercel Adapter Config
// ============================================================================
exports.VercelConfigSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    teamId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    projectName: zod_1.z.string().optional(),
    framework: zod_1.z.enum(['static', 'nextjs', 'other']).default('static'),
    productionDomain: zod_1.z.string().optional(),
});
// ============================================================================
// Cloudflare Pages Adapter Config
// ============================================================================
exports.CloudflarePagesConfigSchema = zod_1.z.object({
    accountId: zod_1.z.string().min(1),
    apiToken: zod_1.z.string().min(1),
    projectName: zod_1.z.string().optional(),
    productionDomain: zod_1.z.string().optional(),
});
// ============================================================================
// Railway Adapter Config (stub)
// ============================================================================
exports.RailwayConfigSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    projectId: zod_1.z.string().min(1),
    environmentId: zod_1.z.string().min(1),
    serviceName: zod_1.z.string().optional(),
});
// ============================================================================
// Fly Adapter Config (stub)
// ============================================================================
exports.FlyConfigSchema = zod_1.z.object({
    accessToken: zod_1.z.string().min(1),
    appName: zod_1.z.string().optional(),
    org: zod_1.z.string().optional(),
}).describe('Creates minimal static container; currently scaffold only.');
// ============================================================================
// Connection Profile Schemas
// ============================================================================
exports.CreateProfileRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    adapter: zod_1.z.enum(['ssh-rsync', 's3', 'vercel', 'cloudflare-pages', 'railway', 'fly']),
    config: zod_1.z.unknown(), // Will be validated by adapter-specific schema
});
exports.UpdateProfileRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    config: zod_1.z.unknown().optional(),
});
exports.ConnectionProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    siteId: zod_1.z.string(),
    name: zod_1.z.string(),
    adapter: zod_1.z.string(),
    isDefault: zod_1.z.boolean(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
    updatedAt: zod_1.z.date().or(zod_1.z.string()),
    // configEnc is never exposed to clients
});
exports.ConnectionProfileWithConfigSchema = exports.ConnectionProfileSchema.extend({
    config: zod_1.z.unknown(), // Decrypted config (masked secrets)
});
// ============================================================================
// Release Schemas
// ============================================================================
exports.ReleaseStatusSchema = zod_1.z.enum(['staged', 'active', 'failed']);
exports.ReleaseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    siteId: zod_1.z.string(),
    deployId: zod_1.z.string(),
    adapter: zod_1.z.string(),
    destinationRef: zod_1.z.string().nullable(),
    status: exports.ReleaseStatusSchema,
    target: zod_1.z.string().default('preview'),
    platformDeploymentId: zod_1.z.string().nullable().optional(),
    previewUrl: zod_1.z.string().nullable().optional(),
    errorMessage: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
    updatedAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.ListReleasesResponseSchema = zod_1.z.array(exports.ReleaseSchema);
// ============================================================================
// Stage/Activate Request Schemas
// ============================================================================
exports.StageDeployRequestSchema = zod_1.z.object({
    profileId: zod_1.z.string().optional(),
    adapter: zod_1.z.string().optional(),
    config: zod_1.z.unknown().optional(),
    target: zod_1.z.enum(['preview', 'production']).default('preview'),
});
exports.ActivateDeployRequestSchema = zod_1.z.object({
    profileId: zod_1.z.string().optional(),
    adapter: zod_1.z.string().optional(),
    config: zod_1.z.unknown().optional(),
    target: zod_1.z.enum(['preview', 'production']).default('preview'),
    comment: zod_1.z.string().optional(),
});
exports.RollbackRequestSchema = zod_1.z.object({
    toDeployId: zod_1.z.string(),
    profileId: zod_1.z.string().optional(),
    adapter: zod_1.z.string().optional(),
    config: zod_1.z.unknown().optional(),
});
// ============================================================================
// Encrypted Blob Schema
// ============================================================================
exports.EncryptedBlobSchema = zod_1.z.object({
    alg: zod_1.z.literal('AES-GCM'),
    iv: zod_1.z.string(),
    ciphertext: zod_1.z.string(),
    tag: zod_1.z.string(),
});
