import type { MagicLinkRequest, MagicLinkResponse, CreateSiteRequest, CreateSiteResponse, ListSitesResponse, GetSiteResponse, CreateDeployResponse, FinalizeDeployResponse, ActivateDeployResponse, ListDeploysResponse, CreateDomainRequest, CreateDomainResponse, CreateTokenRequest, CreateTokenResponse, ListTokensResponse, Deploy } from './schemas.js';
export interface ApiClientOptions {
    baseUrl: string;
    token?: string;
}
export declare class ApiClient {
    private baseUrl;
    private token?;
    constructor(options: ApiClientOptions);
    setToken(token: string): void;
    private request;
    requestMagicLink(data: MagicLinkRequest): Promise<MagicLinkResponse>;
    createSite(data: CreateSiteRequest): Promise<CreateSiteResponse>;
    listSites(): Promise<ListSitesResponse>;
    getSite(siteId: string): Promise<GetSiteResponse>;
    listDeploys(siteId: string): Promise<ListDeploysResponse>;
    createDeploy(siteId: string): Promise<CreateDeployResponse>;
    getDeploy(deployId: string): Promise<Deploy>;
    finalizeDeploy(deployId: string): Promise<FinalizeDeployResponse>;
    activateDeploy(deployId: string): Promise<ActivateDeployResponse>;
    createDomain(siteId: string, data: CreateDomainRequest): Promise<CreateDomainResponse>;
    createBuildLog(data: {
        siteId: string;
        deployId?: string;
        framework: string;
        command: string;
        status?: string;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        duration?: number;
        warnings?: any[];
        nodeVersion?: string;
        packageManager?: string;
        cacheHit?: boolean;
        outputDir?: string;
    }): Promise<any>;
    updateBuildLog(id: string, data: {
        status?: string;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        duration?: number;
        warnings?: any[];
        completedAt?: Date;
    }): Promise<any>;
    getBuildLog(id: string): Promise<any>;
    listBuildLogs(siteId: string, limit?: number): Promise<any>;
    getBuildLogByDeploy(deployId: string): Promise<any>;
    createToken(data: CreateTokenRequest): Promise<CreateTokenResponse>;
    listTokens(): Promise<ListTokensResponse>;
    deleteToken(tokenId: string): Promise<void>;
    fetch<T = any>(path: string, options?: RequestInit): Promise<T>;
    getUploadUrl(): string;
    getPublicUrl(siteId: string, path?: string): string;
    getToken(): string | undefined;
}
