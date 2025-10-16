import type {
  MagicLinkRequest,
  MagicLinkResponse,
  CreateSiteRequest,
  CreateSiteResponse,
  ListSitesResponse,
  GetSiteResponse,
  CreateDeployRequest,
  CreateDeployResponse,
  FinalizeDeployResponse,
  ActivateDeployResponse,
  ListDeploysResponse,
  CreateDomainRequest,
  CreateDomainResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  ListTokensResponse,
  Deploy,
} from './schemas.js';

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Send cookies with requests
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      })) as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async requestMagicLink(data: MagicLinkRequest): Promise<MagicLinkResponse> {
    return this.request('POST', '/v1/auth/magic', data);
  }

  // Sites
  async createSite(data: CreateSiteRequest): Promise<CreateSiteResponse> {
    return this.request('POST', '/v1/sites', data);
  }

  async listSites(): Promise<ListSitesResponse> {
    return this.request('GET', '/v1/sites');
  }

  async getSite(siteId: string): Promise<GetSiteResponse> {
    return this.request('GET', `/v1/sites/${siteId}`);
  }

  async listDeploys(siteId: string): Promise<ListDeploysResponse> {
    return this.request('GET', `/v1/sites/${siteId}/deploys`);
  }

  // Deploys
  async createDeploy(siteId: string): Promise<CreateDeployResponse> {
    return this.request('POST', `/v1/sites/${siteId}/deploys`, {});
  }

  async getDeploy(deployId: string): Promise<Deploy> {
    return this.request('GET', `/v1/deploys/${deployId}`);
  }

  async finalizeDeploy(deployId: string): Promise<FinalizeDeployResponse> {
    return this.request('PATCH', `/v1/deploys/${deployId}/finalize`, {});
  }

  async activateDeploy(deployId: string): Promise<ActivateDeployResponse> {
    return this.request('POST', `/v1/deploys/${deployId}/activate`, {});
  }

  // Domains
  async createDomain(
    siteId: string,
    data: CreateDomainRequest
  ): Promise<CreateDomainResponse> {
    return this.request('POST', `/v1/sites/${siteId}/domains`, data);
  }

  // Build Logs
  async createBuildLog(data: {
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
  }): Promise<any> {
    return this.request('POST', `/v1/sites/${data.siteId}/build-logs`, data);
  }

  async updateBuildLog(
    id: string,
    data: {
      status?: string;
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      duration?: number;
      warnings?: any[];
      completedAt?: Date;
    }
  ): Promise<any> {
    return this.request('PATCH', `/v1/build-logs/${id}`, data);
  }

  async getBuildLog(id: string): Promise<any> {
    return this.request('GET', `/v1/build-logs/${id}`);
  }

  async listBuildLogs(siteId: string, limit = 50): Promise<any> {
    return this.request('GET', `/v1/sites/${siteId}/build-logs?limit=${limit}`);
  }

  async getBuildLogByDeploy(deployId: string): Promise<any> {
    return this.request('GET', `/v1/deploys/${deployId}/build-log`);
  }

  // Tokens
  async createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
    return this.request('POST', '/v1/tokens', data);
  }

  async listTokens(): Promise<ListTokensResponse> {
    return this.request('GET', '/v1/tokens');
  }

  async deleteToken(tokenId: string): Promise<void> {
    return this.request('DELETE', `/v1/tokens/${tokenId}`);
  }

  // Generic fetch method for adapter endpoints
  async fetch<T = any>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      })) as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Helpers
  getUploadUrl(): string {
    return `${this.baseUrl}/v1/uploads`;
  }

  getPublicUrl(siteId: string, path = ''): string {
    const cleanPath = path.replace(/^\//, '');
    return `${this.baseUrl}/public/${siteId}/${cleanPath}`;
  }

  getToken(): string | undefined {
    return this.token;
  }
}

