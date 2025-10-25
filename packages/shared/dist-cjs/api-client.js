"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
class ApiClient {
    baseUrl;
    token;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.token = options.token;
    }
    setToken(token) {
        this.token = token;
    }
    async request(method, path, body) {
        const headers = {
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
            }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        return response.json();
    }
    // Auth
    async requestMagicLink(data) {
        return this.request('POST', '/v1/auth/magic', data);
    }
    // Sites
    async createSite(data) {
        return this.request('POST', '/v1/sites', data);
    }
    async listSites() {
        return this.request('GET', '/v1/sites');
    }
    async getSite(siteId) {
        return this.request('GET', `/v1/sites/${siteId}`);
    }
    async listDeploys(siteId) {
        return this.request('GET', `/v1/sites/${siteId}/deploys`);
    }
    // Deploys
    async createDeploy(siteId) {
        return this.request('POST', `/v1/sites/${siteId}/deploys`, {});
    }
    async getDeploy(deployId) {
        return this.request('GET', `/v1/deploys/${deployId}`);
    }
    async finalizeDeploy(deployId) {
        return this.request('PATCH', `/v1/deploys/${deployId}/finalize`, {});
    }
    async activateDeploy(deployId) {
        return this.request('POST', `/v1/deploys/${deployId}/activate`, {});
    }
    // Domains
    async createDomain(siteId, data) {
        return this.request('POST', `/v1/sites/${siteId}/domains`, data);
    }
    // Build Logs
    async createBuildLog(data) {
        return this.request('POST', `/v1/sites/${data.siteId}/build-logs`, data);
    }
    async updateBuildLog(id, data) {
        return this.request('PATCH', `/v1/build-logs/${id}`, data);
    }
    async getBuildLog(id) {
        return this.request('GET', `/v1/build-logs/${id}`);
    }
    async listBuildLogs(siteId, limit = 50) {
        return this.request('GET', `/v1/sites/${siteId}/build-logs?limit=${limit}`);
    }
    async getBuildLogByDeploy(deployId) {
        return this.request('GET', `/v1/deploys/${deployId}/build-log`);
    }
    // Tokens
    async createToken(data) {
        return this.request('POST', '/v1/tokens', data);
    }
    async listTokens() {
        return this.request('GET', '/v1/tokens');
    }
    async deleteToken(tokenId) {
        return this.request('DELETE', `/v1/tokens/${tokenId}`);
    }
    // Generic fetch method for adapter endpoints
    async fetch(path, options) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
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
            }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        return response.json();
    }
    // Helpers
    getUploadUrl() {
        return `${this.baseUrl}/v1/uploads`;
    }
    getPublicUrl(siteId, path = '') {
        const cleanPath = path.replace(/^\//, '');
        return `${this.baseUrl}/public/${siteId}/${cleanPath}`;
    }
    getToken() {
        return this.token;
    }
}
exports.ApiClient = ApiClient;
