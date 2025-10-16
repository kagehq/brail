import { z } from 'zod';

// ============================================================================
// SSH+rsync Adapter Config
// ============================================================================

export const SshHealthConfigSchema = z.object({
  mode: z.enum(['url', 'canary']),
  url: z.string().url().optional(),
  canaryPath: z.string().url().optional(),
  timeoutMs: z.number().int().positive().default(8000),
  retries: z.number().int().positive().default(5),
});

export const SshRsyncConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().default(22),
  user: z.string().min(1),
  privateKey: z.string().min(1), // PEM format or file path
  basePath: z.string().min(1),
  keepReleases: z.number().int().positive().default(5),
  health: SshHealthConfigSchema.optional(),
});

// ============================================================================
// S3 Adapter Config
// ============================================================================

export const S3ConfigSchema = z.object({
  endpoint: z.string().url().optional(),
  region: z.string().min(1),
  bucket: z.string().min(1),
  prefix: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  forcePathStyle: z.boolean().default(false),
  keepReleases: z.number().int().positive().default(5),
});

// ============================================================================
// Vercel Adapter Config
// ============================================================================

export const VercelConfigSchema = z.object({
  token: z.string().min(1),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  framework: z.enum(['static', 'nextjs', 'other']).default('static'),
  productionDomain: z.string().optional(),
});

// ============================================================================
// Cloudflare Pages Adapter Config
// ============================================================================

export const CloudflarePagesConfigSchema = z.object({
  accountId: z.string().min(1),
  apiToken: z.string().min(1),
  projectName: z.string().optional(),
  productionDomain: z.string().optional(),
});

// ============================================================================
// Railway Adapter Config (stub)
// ============================================================================

export const RailwayConfigSchema = z.object({
  token: z.string().min(1),
  projectId: z.string().min(1),
  environmentId: z.string().min(1),
  serviceName: z.string().optional(),
});

// ============================================================================
// Fly Adapter Config (stub)
// ============================================================================

export const FlyConfigSchema = z.object({
  accessToken: z.string().min(1),
  appName: z.string().optional(),
  org: z.string().optional(),
}).describe('Creates minimal static container; currently scaffold only.');

// ============================================================================
// Connection Profile Schemas
// ============================================================================

export const CreateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100),
  adapter: z.enum(['ssh-rsync', 's3', 'vercel', 'cloudflare-pages', 'railway', 'fly']),
  config: z.unknown(), // Will be validated by adapter-specific schema
});

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.unknown().optional(),
});

export const ConnectionProfileSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  name: z.string(),
  adapter: z.string(),
  isDefault: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  // configEnc is never exposed to clients
});

export const ConnectionProfileWithConfigSchema = ConnectionProfileSchema.extend({
  config: z.unknown(), // Decrypted config (masked secrets)
});

// ============================================================================
// Release Schemas
// ============================================================================

export const ReleaseStatusSchema = z.enum(['staged', 'active', 'failed']);

export const ReleaseSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  deployId: z.string(),
  adapter: z.string(),
  destinationRef: z.string().nullable(),
  status: ReleaseStatusSchema,
  target: z.string().default('preview'),
  platformDeploymentId: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const ListReleasesResponseSchema = z.array(ReleaseSchema);

// ============================================================================
// Stage/Activate Request Schemas
// ============================================================================

export const StageDeployRequestSchema = z.object({
  profileId: z.string().optional(),
  adapter: z.string().optional(),
  config: z.unknown().optional(),
  target: z.enum(['preview', 'production']).default('preview'),
});

export const ActivateDeployRequestSchema = z.object({
  profileId: z.string().optional(),
  adapter: z.string().optional(),
  config: z.unknown().optional(),
  target: z.enum(['preview', 'production']).default('preview'),
  comment: z.string().optional(),
});

export const RollbackRequestSchema = z.object({
  toDeployId: z.string(),
  profileId: z.string().optional(),
  adapter: z.string().optional(),
  config: z.unknown().optional(),
});

// ============================================================================
// Encrypted Blob Schema
// ============================================================================

export const EncryptedBlobSchema = z.object({
  alg: z.literal('AES-GCM'),
  iv: z.string(),
  ciphertext: z.string(),
  tag: z.string(),
});

// ============================================================================
// Types
// ============================================================================

export type SshHealthConfig = z.infer<typeof SshHealthConfigSchema>;
export type SshRsyncConfig = z.infer<typeof SshRsyncConfigSchema>;
export type S3Config = z.infer<typeof S3ConfigSchema>;
export type VercelConfig = z.infer<typeof VercelConfigSchema>;
export type CloudflarePagesConfig = z.infer<typeof CloudflarePagesConfigSchema>;
export type RailwayConfig = z.infer<typeof RailwayConfigSchema>;
export type FlyConfig = z.infer<typeof FlyConfigSchema>;

export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ConnectionProfile = z.infer<typeof ConnectionProfileSchema>;
export type ConnectionProfileWithConfig = z.infer<
  typeof ConnectionProfileWithConfigSchema
>;

export type Release = z.infer<typeof ReleaseSchema>;
export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;
export type ListReleasesResponse = z.infer<typeof ListReleasesResponseSchema>;

export type StageDeployRequest = z.infer<typeof StageDeployRequestSchema>;
export type ActivateDeployRequest = z.infer<typeof ActivateDeployRequestSchema>;
export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;

export type EncryptedBlob = z.infer<typeof EncryptedBlobSchema>;

