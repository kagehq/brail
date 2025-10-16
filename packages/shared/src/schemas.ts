import { z } from 'zod';

// ============================================================================
// Entity Schemas
// ============================================================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.date().or(z.string()),
});

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date().or(z.string()),
});

export const SiteSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  activeDeployId: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const DeployStatusSchema = z.enum([
  'uploading',
  'uploaded',
  'active',
  'failed',
]);

export const DeploySchema = z.object({
  id: z.string(),
  siteId: z.string(),
  status: DeployStatusSchema,
  fileCount: z.number().int(),
  byteSize: z.bigint().or(z.number()),
  comment: z.string().nullable().optional(),
  deployedBy: z.string().nullable().optional(),
  deployedByEmail: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const DomainStatusSchema = z.enum(['pending', 'active']);

export const DomainSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  hostname: z.string(),
  status: DomainStatusSchema,
  createdAt: z.date().or(z.string()),
});

export const TokenSchema = z.object({
  id: z.string(),
  siteId: z.string().nullable(),
  name: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.date().or(z.string()).nullable(),
  createdAt: z.date().or(z.string()),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// Auth
export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const MagicLinkResponseSchema = z.object({
  message: z.string(),
});

// Sites
export const CreateSiteRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const CreateSiteResponseSchema = SiteSchema;

export const ListSitesResponseSchema = z.array(SiteSchema);

export const GetSiteResponseSchema = SiteSchema.extend({
  activeDeploy: DeploySchema.nullable().optional(),
});

// Deploys
export const CreateDeployRequestSchema = z.object({
  siteId: z.string(),
});

export const CreateDeployResponseSchema = z.object({
  deployId: z.string(),
  uploadEndpoint: z.string(),
});

export const FinalizeDeployResponseSchema = DeploySchema;

export const ActivateDeployResponseSchema = z.object({
  success: z.boolean(),
  deploy: DeploySchema,
  publicUrl: z.string(),
});

export const ListDeploysResponseSchema = z.array(DeploySchema);

// Domains
export const CreateDomainRequestSchema = z.object({
  hostname: z.string().min(1),
});

export const CreateDomainResponseSchema = DomainSchema.extend({
  cnameTarget: z.string(),
});

// Tokens
export const CreateTokenRequestSchema = z.object({
  siteId: z.string().nullable().optional(),
  name: z.string().min(1),
  scopes: z.array(z.string()).default(['deploy:write']),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const CreateTokenResponseSchema = z.object({
  token: TokenSchema,
  tokenPlain: z.string(),
});

export const ListTokensResponseSchema = z.array(TokenSchema);

// ============================================================================
// _drop.json Configuration Schema
// ============================================================================

export const DropHeaderSchema = z.object({
  path: z.string(),
  set: z.record(z.string()),
});

export const DropRedirectSchema = z.object({
  from: z.string(),
  to: z.string(),
  status: z.number().int().min(300).max(399).default(301),
});

export const DropConfigSchema = z.object({
  headers: z.array(DropHeaderSchema).optional(),
  redirects: z.array(DropRedirectSchema).optional(),
});

// ============================================================================
// Error Schema
// ============================================================================

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
});

// ============================================================================
// Types (exported for TypeScript usage)
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type Org = z.infer<typeof OrgSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Deploy = z.infer<typeof DeploySchema>;
export type DeployStatus = z.infer<typeof DeployStatusSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type DomainStatus = z.infer<typeof DomainStatusSchema>;
export type Token = z.infer<typeof TokenSchema>;

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
export type MagicLinkResponse = z.infer<typeof MagicLinkResponseSchema>;

export type CreateSiteRequest = z.infer<typeof CreateSiteRequestSchema>;
export type CreateSiteResponse = z.infer<typeof CreateSiteResponseSchema>;
export type ListSitesResponse = z.infer<typeof ListSitesResponseSchema>;
export type GetSiteResponse = z.infer<typeof GetSiteResponseSchema>;

export type CreateDeployRequest = z.infer<typeof CreateDeployRequestSchema>;
export type CreateDeployResponse = z.infer<typeof CreateDeployResponseSchema>;
export type FinalizeDeployResponse = z.infer<typeof FinalizeDeployResponseSchema>;
export type ActivateDeployResponse = z.infer<typeof ActivateDeployResponseSchema>;
export type ListDeploysResponse = z.infer<typeof ListDeploysResponseSchema>;

export type CreateDomainRequest = z.infer<typeof CreateDomainRequestSchema>;
export type CreateDomainResponse = z.infer<typeof CreateDomainResponseSchema>;

export type CreateTokenRequest = z.infer<typeof CreateTokenRequestSchema>;
export type CreateTokenResponse = z.infer<typeof CreateTokenResponseSchema>;
export type ListTokensResponse = z.infer<typeof ListTokensResponseSchema>;

export type DropHeader = z.infer<typeof DropHeaderSchema>;
export type DropRedirect = z.infer<typeof DropRedirectSchema>;
export type DropConfig = z.infer<typeof DropConfigSchema>;

export type ApiError = z.infer<typeof ApiErrorSchema>;

