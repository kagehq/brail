import { z } from 'zod';
export declare const SshHealthConfigSchema: z.ZodObject<{
    mode: z.ZodEnum<["url", "canary"]>;
    url: z.ZodOptional<z.ZodString>;
    canaryPath: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    retries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mode: "url" | "canary";
    timeoutMs: number;
    retries: number;
    url?: string | undefined;
    canaryPath?: string | undefined;
}, {
    mode: "url" | "canary";
    url?: string | undefined;
    canaryPath?: string | undefined;
    timeoutMs?: number | undefined;
    retries?: number | undefined;
}>;
export declare const SshRsyncConfigSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodDefault<z.ZodNumber>;
    user: z.ZodString;
    privateKey: z.ZodString;
    basePath: z.ZodString;
    keepReleases: z.ZodDefault<z.ZodNumber>;
    health: z.ZodOptional<z.ZodObject<{
        mode: z.ZodEnum<["url", "canary"]>;
        url: z.ZodOptional<z.ZodString>;
        canaryPath: z.ZodOptional<z.ZodString>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode: "url" | "canary";
        timeoutMs: number;
        retries: number;
        url?: string | undefined;
        canaryPath?: string | undefined;
    }, {
        mode: "url" | "canary";
        url?: string | undefined;
        canaryPath?: string | undefined;
        timeoutMs?: number | undefined;
        retries?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    user: string;
    privateKey: string;
    basePath: string;
    keepReleases: number;
    health?: {
        mode: "url" | "canary";
        timeoutMs: number;
        retries: number;
        url?: string | undefined;
        canaryPath?: string | undefined;
    } | undefined;
}, {
    host: string;
    user: string;
    privateKey: string;
    basePath: string;
    port?: number | undefined;
    keepReleases?: number | undefined;
    health?: {
        mode: "url" | "canary";
        url?: string | undefined;
        canaryPath?: string | undefined;
        timeoutMs?: number | undefined;
        retries?: number | undefined;
    } | undefined;
}>;
export declare const S3ConfigSchema: z.ZodObject<{
    endpoint: z.ZodOptional<z.ZodString>;
    region: z.ZodString;
    bucket: z.ZodString;
    prefix: z.ZodString;
    accessKeyId: z.ZodString;
    secretAccessKey: z.ZodString;
    forcePathStyle: z.ZodDefault<z.ZodBoolean>;
    keepReleases: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    keepReleases: number;
    region: string;
    bucket: string;
    prefix: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    endpoint?: string | undefined;
}, {
    region: string;
    bucket: string;
    prefix: string;
    accessKeyId: string;
    secretAccessKey: string;
    keepReleases?: number | undefined;
    endpoint?: string | undefined;
    forcePathStyle?: boolean | undefined;
}>;
export declare const VercelConfigSchema: z.ZodObject<{
    token: z.ZodString;
    teamId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    projectName: z.ZodOptional<z.ZodString>;
    framework: z.ZodDefault<z.ZodEnum<["static", "nextjs", "other"]>>;
    productionDomain: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token: string;
    framework: "static" | "nextjs" | "other";
    teamId?: string | undefined;
    projectId?: string | undefined;
    projectName?: string | undefined;
    productionDomain?: string | undefined;
}, {
    token: string;
    teamId?: string | undefined;
    projectId?: string | undefined;
    projectName?: string | undefined;
    framework?: "static" | "nextjs" | "other" | undefined;
    productionDomain?: string | undefined;
}>;
export declare const CloudflarePagesConfigSchema: z.ZodObject<{
    accountId: z.ZodString;
    apiToken: z.ZodString;
    projectName: z.ZodOptional<z.ZodString>;
    productionDomain: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accountId: string;
    apiToken: string;
    projectName?: string | undefined;
    productionDomain?: string | undefined;
}, {
    accountId: string;
    apiToken: string;
    projectName?: string | undefined;
    productionDomain?: string | undefined;
}>;
export declare const RailwayConfigSchema: z.ZodObject<{
    token: z.ZodString;
    projectId: z.ZodString;
    environmentId: z.ZodString;
    serviceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token: string;
    projectId: string;
    environmentId: string;
    serviceName?: string | undefined;
}, {
    token: string;
    projectId: string;
    environmentId: string;
    serviceName?: string | undefined;
}>;
export declare const FlyConfigSchema: z.ZodObject<{
    accessToken: z.ZodString;
    appName: z.ZodOptional<z.ZodString>;
    org: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    appName?: string | undefined;
    org?: string | undefined;
}, {
    accessToken: string;
    appName?: string | undefined;
    org?: string | undefined;
}>;
export declare const CreateProfileRequestSchema: z.ZodObject<{
    name: z.ZodString;
    adapter: z.ZodEnum<["ssh-rsync", "s3", "vercel", "cloudflare-pages", "railway", "fly"]>;
    config: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    name: string;
    adapter: "ssh-rsync" | "s3" | "vercel" | "cloudflare-pages" | "railway" | "fly";
    config?: unknown;
}, {
    name: string;
    adapter: "ssh-rsync" | "s3" | "vercel" | "cloudflare-pages" | "railway" | "fly";
    config?: unknown;
}>;
export declare const UpdateProfileRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    config?: unknown;
}, {
    name?: string | undefined;
    config?: unknown;
}>;
export declare const ConnectionProfileSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    name: z.ZodString;
    adapter: z.ZodString;
    isDefault: z.ZodBoolean;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    adapter: string;
    id: string;
    siteId: string;
    isDefault: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}, {
    name: string;
    adapter: string;
    id: string;
    siteId: string;
    isDefault: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}>;
export declare const ConnectionProfileWithConfigSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    name: z.ZodString;
    adapter: z.ZodString;
    isDefault: z.ZodBoolean;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
} & {
    config: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    name: string;
    adapter: string;
    id: string;
    siteId: string;
    isDefault: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    config?: unknown;
}, {
    name: string;
    adapter: string;
    id: string;
    siteId: string;
    isDefault: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    config?: unknown;
}>;
export declare const ReleaseStatusSchema: z.ZodEnum<["staged", "active", "failed"]>;
export declare const ReleaseSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    deployId: z.ZodString;
    adapter: z.ZodString;
    destinationRef: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["staged", "active", "failed"]>;
    target: z.ZodDefault<z.ZodString>;
    platformDeploymentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    previewUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "staged" | "active" | "failed";
    adapter: string;
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deployId: string;
    destinationRef: string | null;
    target: string;
    platformDeploymentId?: string | null | undefined;
    previewUrl?: string | null | undefined;
    errorMessage?: string | null | undefined;
}, {
    status: "staged" | "active" | "failed";
    adapter: string;
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deployId: string;
    destinationRef: string | null;
    target?: string | undefined;
    platformDeploymentId?: string | null | undefined;
    previewUrl?: string | null | undefined;
    errorMessage?: string | null | undefined;
}>;
export declare const ListReleasesResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    deployId: z.ZodString;
    adapter: z.ZodString;
    destinationRef: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["staged", "active", "failed"]>;
    target: z.ZodDefault<z.ZodString>;
    platformDeploymentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    previewUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    errorMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "staged" | "active" | "failed";
    adapter: string;
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deployId: string;
    destinationRef: string | null;
    target: string;
    platformDeploymentId?: string | null | undefined;
    previewUrl?: string | null | undefined;
    errorMessage?: string | null | undefined;
}, {
    status: "staged" | "active" | "failed";
    adapter: string;
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deployId: string;
    destinationRef: string | null;
    target?: string | undefined;
    platformDeploymentId?: string | null | undefined;
    previewUrl?: string | null | undefined;
    errorMessage?: string | null | undefined;
}>, "many">;
export declare const StageDeployRequestSchema: z.ZodObject<{
    profileId: z.ZodOptional<z.ZodString>;
    adapter: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodUnknown>;
    target: z.ZodDefault<z.ZodEnum<["preview", "production"]>>;
}, "strip", z.ZodTypeAny, {
    target: "preview" | "production";
    adapter?: string | undefined;
    config?: unknown;
    profileId?: string | undefined;
}, {
    adapter?: string | undefined;
    config?: unknown;
    target?: "preview" | "production" | undefined;
    profileId?: string | undefined;
}>;
export declare const ActivateDeployRequestSchema: z.ZodObject<{
    profileId: z.ZodOptional<z.ZodString>;
    adapter: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodUnknown>;
    target: z.ZodDefault<z.ZodEnum<["preview", "production"]>>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    target: "preview" | "production";
    adapter?: string | undefined;
    config?: unknown;
    profileId?: string | undefined;
    comment?: string | undefined;
}, {
    adapter?: string | undefined;
    config?: unknown;
    target?: "preview" | "production" | undefined;
    profileId?: string | undefined;
    comment?: string | undefined;
}>;
export declare const RollbackRequestSchema: z.ZodObject<{
    toDeployId: z.ZodString;
    profileId: z.ZodOptional<z.ZodString>;
    adapter: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    toDeployId: string;
    adapter?: string | undefined;
    config?: unknown;
    profileId?: string | undefined;
}, {
    toDeployId: string;
    adapter?: string | undefined;
    config?: unknown;
    profileId?: string | undefined;
}>;
export declare const EncryptedBlobSchema: z.ZodObject<{
    alg: z.ZodLiteral<"AES-GCM">;
    iv: z.ZodString;
    ciphertext: z.ZodString;
    tag: z.ZodString;
}, "strip", z.ZodTypeAny, {
    alg: "AES-GCM";
    iv: string;
    ciphertext: string;
    tag: string;
}, {
    alg: "AES-GCM";
    iv: string;
    ciphertext: string;
    tag: string;
}>;
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
export type ConnectionProfileWithConfig = z.infer<typeof ConnectionProfileWithConfigSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;
export type ListReleasesResponse = z.infer<typeof ListReleasesResponseSchema>;
export type StageDeployRequest = z.infer<typeof StageDeployRequestSchema>;
export type ActivateDeployRequest = z.infer<typeof ActivateDeployRequestSchema>;
export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;
export type EncryptedBlob = z.infer<typeof EncryptedBlobSchema>;
