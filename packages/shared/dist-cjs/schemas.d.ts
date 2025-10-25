import { z } from 'zod';
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string | Date;
    email: string;
}, {
    id: string;
    createdAt: string | Date;
    email: string;
}>;
export declare const OrgSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string | Date;
}, {
    name: string;
    id: string;
    createdAt: string | Date;
}>;
export declare const SiteSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    activeDeployId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}>;
export declare const DeployStatusSchema: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
export declare const DeploySchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    status: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
    fileCount: z.ZodNumber;
    byteSize: z.ZodUnion<[z.ZodBigInt, z.ZodNumber]>;
    comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedByEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}>;
export declare const DomainStatusSchema: z.ZodEnum<["pending", "active"]>;
export declare const DomainSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    hostname: z.ZodString;
    status: z.ZodEnum<["pending", "active"]>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "pending";
    id: string;
    siteId: string;
    createdAt: string | Date;
    hostname: string;
}, {
    status: "active" | "pending";
    id: string;
    siteId: string;
    createdAt: string | Date;
    hostname: string;
}>;
export declare const TokenSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodNullable<z.ZodString>;
    name: z.ZodString;
    scopes: z.ZodArray<z.ZodString, "many">;
    expiresAt: z.ZodNullable<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    siteId: string | null;
    createdAt: string | Date;
    scopes: string[];
    expiresAt: string | Date | null;
}, {
    name: string;
    id: string;
    siteId: string | null;
    createdAt: string | Date;
    scopes: string[];
    expiresAt: string | Date | null;
}>;
export declare const MagicLinkRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const MagicLinkResponseSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export declare const CreateSiteRequestSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const CreateSiteResponseSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    activeDeployId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}>;
export declare const ListSitesResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    activeDeployId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
}>, "many">;
export declare const GetSiteResponseSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    activeDeployId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
} & {
    activeDeploy: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        siteId: z.ZodString;
        status: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
        fileCount: z.ZodNumber;
        byteSize: z.ZodUnion<[z.ZodBigInt, z.ZodNumber]>;
        comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deployedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deployedByEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
        updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    }, {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
    activeDeploy?: {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    } | null | undefined;
}, {
    name: string;
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    orgId: string;
    activeDeployId: string | null;
    activeDeploy?: {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    } | null | undefined;
}>;
export declare const CreateDeployRequestSchema: z.ZodObject<{
    siteId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    siteId: string;
}, {
    siteId: string;
}>;
export declare const CreateDeployResponseSchema: z.ZodObject<{
    deployId: z.ZodString;
    uploadEndpoint: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deployId: string;
    uploadEndpoint: string;
}, {
    deployId: string;
    uploadEndpoint: string;
}>;
export declare const FinalizeDeployResponseSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    status: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
    fileCount: z.ZodNumber;
    byteSize: z.ZodUnion<[z.ZodBigInt, z.ZodNumber]>;
    comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedByEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}>;
export declare const ActivateDeployResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    deploy: z.ZodObject<{
        id: z.ZodString;
        siteId: z.ZodString;
        status: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
        fileCount: z.ZodNumber;
        byteSize: z.ZodUnion<[z.ZodBigInt, z.ZodNumber]>;
        comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deployedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deployedByEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
        updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    }, {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    }>;
    publicUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    deploy: {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    };
    publicUrl: string;
}, {
    success: boolean;
    deploy: {
        status: "active" | "failed" | "uploading" | "uploaded";
        id: string;
        siteId: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        fileCount: number;
        byteSize: number | bigint;
        comment?: string | null | undefined;
        deployedBy?: string | null | undefined;
        deployedByEmail?: string | null | undefined;
        duration?: number | null | undefined;
    };
    publicUrl: string;
}>;
export declare const ListDeploysResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    status: z.ZodEnum<["uploading", "uploaded", "active", "failed"]>;
    fileCount: z.ZodNumber;
    byteSize: z.ZodUnion<[z.ZodBigInt, z.ZodNumber]>;
    comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deployedByEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}, {
    status: "active" | "failed" | "uploading" | "uploaded";
    id: string;
    siteId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fileCount: number;
    byteSize: number | bigint;
    comment?: string | null | undefined;
    deployedBy?: string | null | undefined;
    deployedByEmail?: string | null | undefined;
    duration?: number | null | undefined;
}>, "many">;
export declare const CreateDomainRequestSchema: z.ZodObject<{
    hostname: z.ZodString;
}, "strip", z.ZodTypeAny, {
    hostname: string;
}, {
    hostname: string;
}>;
export declare const CreateDomainResponseSchema: z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodString;
    hostname: z.ZodString;
    status: z.ZodEnum<["pending", "active"]>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
} & {
    cnameTarget: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "pending";
    id: string;
    siteId: string;
    createdAt: string | Date;
    hostname: string;
    cnameTarget: string;
}, {
    status: "active" | "pending";
    id: string;
    siteId: string;
    createdAt: string | Date;
    hostname: string;
    cnameTarget: string;
}>;
export declare const CreateTokenRequestSchema: z.ZodObject<{
    siteId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    scopes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    scopes: string[];
    siteId?: string | null | undefined;
    expiresAt?: string | null | undefined;
}, {
    name: string;
    siteId?: string | null | undefined;
    scopes?: string[] | undefined;
    expiresAt?: string | null | undefined;
}>;
export declare const CreateTokenResponseSchema: z.ZodObject<{
    token: z.ZodObject<{
        id: z.ZodString;
        siteId: z.ZodNullable<z.ZodString>;
        name: z.ZodString;
        scopes: z.ZodArray<z.ZodString, "many">;
        expiresAt: z.ZodNullable<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        siteId: string | null;
        createdAt: string | Date;
        scopes: string[];
        expiresAt: string | Date | null;
    }, {
        name: string;
        id: string;
        siteId: string | null;
        createdAt: string | Date;
        scopes: string[];
        expiresAt: string | Date | null;
    }>;
    tokenPlain: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: {
        name: string;
        id: string;
        siteId: string | null;
        createdAt: string | Date;
        scopes: string[];
        expiresAt: string | Date | null;
    };
    tokenPlain: string;
}, {
    token: {
        name: string;
        id: string;
        siteId: string | null;
        createdAt: string | Date;
        scopes: string[];
        expiresAt: string | Date | null;
    };
    tokenPlain: string;
}>;
export declare const ListTokensResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    siteId: z.ZodNullable<z.ZodString>;
    name: z.ZodString;
    scopes: z.ZodArray<z.ZodString, "many">;
    expiresAt: z.ZodNullable<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    siteId: string | null;
    createdAt: string | Date;
    scopes: string[];
    expiresAt: string | Date | null;
}, {
    name: string;
    id: string;
    siteId: string | null;
    createdAt: string | Date;
    scopes: string[];
    expiresAt: string | Date | null;
}>, "many">;
export declare const DropHeaderSchema: z.ZodObject<{
    path: z.ZodString;
    set: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    set: Record<string, string>;
}, {
    path: string;
    set: Record<string, string>;
}>;
export declare const DropRedirectSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    status: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: number;
    from: string;
    to: string;
}, {
    from: string;
    to: string;
    status?: number | undefined;
}>;
export declare const DropConfigSchema: z.ZodObject<{
    headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        set: z.ZodRecord<z.ZodString, z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        set: Record<string, string>;
    }, {
        path: string;
        set: Record<string, string>;
    }>, "many">>;
    redirects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        status: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: number;
        from: string;
        to: string;
    }, {
        from: string;
        to: string;
        status?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    headers?: {
        path: string;
        set: Record<string, string>;
    }[] | undefined;
    redirects?: {
        status: number;
        from: string;
        to: string;
    }[] | undefined;
}, {
    headers?: {
        path: string;
        set: Record<string, string>;
    }[] | undefined;
    redirects?: {
        from: string;
        to: string;
        status?: number | undefined;
    }[] | undefined;
}>;
export declare const ApiErrorSchema: z.ZodObject<{
    statusCode: z.ZodNumber;
    message: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    statusCode: number;
    error?: string | undefined;
}, {
    message: string;
    statusCode: number;
    error?: string | undefined;
}>;
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
