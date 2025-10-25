"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorSchema = exports.DropConfigSchema = exports.DropRedirectSchema = exports.DropHeaderSchema = exports.ListTokensResponseSchema = exports.CreateTokenResponseSchema = exports.CreateTokenRequestSchema = exports.CreateDomainResponseSchema = exports.CreateDomainRequestSchema = exports.ListDeploysResponseSchema = exports.ActivateDeployResponseSchema = exports.FinalizeDeployResponseSchema = exports.CreateDeployResponseSchema = exports.CreateDeployRequestSchema = exports.GetSiteResponseSchema = exports.ListSitesResponseSchema = exports.CreateSiteResponseSchema = exports.CreateSiteRequestSchema = exports.MagicLinkResponseSchema = exports.MagicLinkRequestSchema = exports.TokenSchema = exports.DomainSchema = exports.DomainStatusSchema = exports.DeploySchema = exports.DeployStatusSchema = exports.SiteSchema = exports.OrgSchema = exports.UserSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Entity Schemas
// ============================================================================
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.OrgSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.SiteSchema = zod_1.z.object({
    id: zod_1.z.string(),
    orgId: zod_1.z.string(),
    name: zod_1.z.string(),
    activeDeployId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
    updatedAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.DeployStatusSchema = zod_1.z.enum([
    'uploading',
    'uploaded',
    'active',
    'failed',
]);
exports.DeploySchema = zod_1.z.object({
    id: zod_1.z.string(),
    siteId: zod_1.z.string(),
    status: exports.DeployStatusSchema,
    fileCount: zod_1.z.number().int(),
    byteSize: zod_1.z.bigint().or(zod_1.z.number()),
    comment: zod_1.z.string().nullable().optional(),
    deployedBy: zod_1.z.string().nullable().optional(),
    deployedByEmail: zod_1.z.string().nullable().optional(),
    duration: zod_1.z.number().int().nullable().optional(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
    updatedAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.DomainStatusSchema = zod_1.z.enum(['pending', 'active']);
exports.DomainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    siteId: zod_1.z.string(),
    hostname: zod_1.z.string(),
    status: exports.DomainStatusSchema,
    createdAt: zod_1.z.date().or(zod_1.z.string()),
});
exports.TokenSchema = zod_1.z.object({
    id: zod_1.z.string(),
    siteId: zod_1.z.string().nullable(),
    name: zod_1.z.string(),
    scopes: zod_1.z.array(zod_1.z.string()),
    expiresAt: zod_1.z.date().or(zod_1.z.string()).nullable(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
});
// ============================================================================
// API Request/Response Schemas
// ============================================================================
// Auth
exports.MagicLinkRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.MagicLinkResponseSchema = zod_1.z.object({
    message: zod_1.z.string(),
});
// Sites
exports.CreateSiteRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
});
exports.CreateSiteResponseSchema = exports.SiteSchema;
exports.ListSitesResponseSchema = zod_1.z.array(exports.SiteSchema);
exports.GetSiteResponseSchema = exports.SiteSchema.extend({
    activeDeploy: exports.DeploySchema.nullable().optional(),
});
// Deploys
exports.CreateDeployRequestSchema = zod_1.z.object({
    siteId: zod_1.z.string(),
});
exports.CreateDeployResponseSchema = zod_1.z.object({
    deployId: zod_1.z.string(),
    uploadEndpoint: zod_1.z.string(),
});
exports.FinalizeDeployResponseSchema = exports.DeploySchema;
exports.ActivateDeployResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    deploy: exports.DeploySchema,
    publicUrl: zod_1.z.string(),
});
exports.ListDeploysResponseSchema = zod_1.z.array(exports.DeploySchema);
// Domains
exports.CreateDomainRequestSchema = zod_1.z.object({
    hostname: zod_1.z.string().min(1),
});
exports.CreateDomainResponseSchema = exports.DomainSchema.extend({
    cnameTarget: zod_1.z.string(),
});
// Tokens
exports.CreateTokenRequestSchema = zod_1.z.object({
    siteId: zod_1.z.string().nullable().optional(),
    name: zod_1.z.string().min(1),
    scopes: zod_1.z.array(zod_1.z.string()).default(['deploy:write']),
    expiresAt: zod_1.z.string().datetime().nullable().optional(),
});
exports.CreateTokenResponseSchema = zod_1.z.object({
    token: exports.TokenSchema,
    tokenPlain: zod_1.z.string(),
});
exports.ListTokensResponseSchema = zod_1.z.array(exports.TokenSchema);
// ============================================================================
// _drop.json Configuration Schema
// ============================================================================
exports.DropHeaderSchema = zod_1.z.object({
    path: zod_1.z.string(),
    set: zod_1.z.record(zod_1.z.string()),
});
exports.DropRedirectSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    status: zod_1.z.number().int().min(300).max(399).default(301),
});
exports.DropConfigSchema = zod_1.z.object({
    headers: zod_1.z.array(exports.DropHeaderSchema).optional(),
    redirects: zod_1.z.array(exports.DropRedirectSchema).optional(),
});
// ============================================================================
// Error Schema
// ============================================================================
exports.ApiErrorSchema = zod_1.z.object({
    statusCode: zod_1.z.number(),
    message: zod_1.z.string(),
    error: zod_1.z.string().optional(),
});
