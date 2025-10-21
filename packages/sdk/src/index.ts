/**
 * @brailhq/sdk
 * 
 * Official JavaScript SDK for deploying to Brail in just a few lines of code.
 * 
 * @example
 * ```typescript
 * import { Brail } from '@brailhq/sdk';
 * 
 * const brail = new Brail({ 
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.brail.io'
 * });
 * 
 * // Deploy a site
 * const deployment = await brail.deploy({
 *   siteId: 'my-site',
 *   path: './dist',
 *   adapter: 'vercel',
 *   config: { token: 'xxx', projectId: 'yyy' }
 * });
 * 
 * console.log('Deployed to:', deployment.url);
 * ```
 */

import { ApiClient } from '@br/shared';
import type {
  Site,
  Deploy,
  CreateSiteRequest,
  CreateDeployResponse,
  Domain,
  Token,
  CreateTokenRequest,
} from '@br/shared';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import FormData from 'form-data';

// ============================================================================
// SDK Configuration
// ============================================================================

export interface BrailConfig {
  /** API base URL (defaults to http://localhost:3000) */
  baseUrl?: string;
  /** API key or session token for authentication */
  apiKey: string;
}

export interface DeployOptions {
  /** Site ID to deploy to */
  siteId: string;
  /** Local path to deploy (directory or file) */
  path: string;
  /** Adapter name (e.g., 'vercel', 's3', 'cloudflare-pages') */
  adapter?: string;
  /** Adapter configuration (credentials, settings, etc.) */
  config?: Record<string, unknown>;
  /** Connection profile ID (alternative to adapter + config) */
  profileId?: string;
  /** Target environment (preview | production) */
  target?: 'preview' | 'production';
  /** Optional deployment comment */
  comment?: string;
  /** Auto-activate after upload (default: true) */
  autoActivate?: boolean;
  /** Progress callback for uploads */
  onProgress?: (progress: DeployProgress) => void;
}

export interface DeployProgress {
  stage: 'uploading' | 'finalizing' | 'staging' | 'activating' | 'complete';
  filesUploaded?: number;
  totalFiles?: number;
  bytesUploaded?: number;
  totalBytes?: number;
  message?: string;
}

export interface DeployResult {
  /** Deployment ID */
  deployId: string;
  /** Site ID */
  siteId: string;
  /** Deployment status */
  status: string;
  /** Public URL (if activated) */
  url?: string;
  /** Preview URL from adapter */
  previewUrl?: string;
  /** Platform-specific deployment ID */
  platformDeploymentId?: string;
  /** Deployment metadata */
  deploy: Deploy;
}

export interface PromoteOptions {
  /** Site ID */
  siteId: string;
  /** Deploy ID to promote */
  deployId: string;
  /** Connection profile ID */
  profileId?: string;
  /** Adapter name (if not using profile) */
  adapter?: string;
  /** Adapter config (if not using profile) */
  config?: Record<string, unknown>;
  /** Optional comment */
  comment?: string;
}

export interface RollbackOptions {
  /** Site ID */
  siteId: string;
  /** Deploy ID to rollback to */
  toDeployId: string;
  /** Connection profile ID */
  profileId?: string;
  /** Adapter name (if not using profile) */
  adapter?: string;
  /** Adapter config (if not using profile) */
  config?: Record<string, unknown>;
}

export interface CreateSandboxOptions {
  /** Sandbox provider (vercel-sandbox | cloudflare-sandbox) */
  provider: 'vercel-sandbox' | 'cloudflare-sandbox';
  /** Local path to deploy */
  path: string;
  /** Sandbox configuration */
  config: {
    /** Vercel: API token */
    token?: string;
    /** Vercel: Runtime (node22 | python3.13) */
    runtime?: 'node22' | 'python3.13';
    /** Vercel: vCPUs */
    vcpus?: number;
    /** Cloudflare: Account ID */
    accountId?: string;
    /** Cloudflare: API token */
    apiToken?: string;
    /** Cloudflare: Sandbox binding name */
    sandboxBinding?: string;
    /** Optional build command */
    buildCommand?: string;
    /** Optional start command */
    startCommand?: string;
    [key: string]: unknown;
  };
  /** Site name (auto-generated if not provided) */
  siteName?: string;
}

export interface SandboxResult {
  /** Sandbox URL */
  url: string;
  /** Sandbox ID */
  sandboxId: string;
  /** Site ID */
  siteId: string;
  /** Deploy ID */
  deployId: string;
}

// ============================================================================
// Main SDK Class
// ============================================================================

export class Brail {
  private client: ApiClient;
  private baseUrl: string;

  constructor(config: BrailConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      token: config.apiKey,
    });
  }

  // ==========================================================================
  // Quick Deploy (Main Use Case)
  // ==========================================================================

  /**
   * Deploy a site in one command.
   * 
   * This is the primary method for most users - it handles:
   * - Creating/uploading files
   * - Finalizing the deployment
   * - Staging to adapter (if provided)
   * - Activating the deployment
   * 
   * @example
   * ```typescript
   * const result = await brail.deploy({
   *   siteId: 'my-site',
   *   path: './dist',
   *   adapter: 'vercel',
   *   config: { token: 'xxx', projectId: 'yyy' }
   * });
   * ```
   */
  async deploy(options: DeployOptions): Promise<DeployResult> {
    const {
      siteId,
      path,
      adapter,
      config,
      profileId,
      target = 'preview',
      comment,
      autoActivate = true,
      onProgress,
    } = options;

    try {
      // Step 1: Create deployment
      onProgress?.({ stage: 'uploading', message: 'Creating deployment...' });
      const { deployId, uploadEndpoint } = await this.client.createDeploy(siteId);

      // Step 2: Upload files
      onProgress?.({ stage: 'uploading', message: 'Uploading files...' });
      const files = await this.collectFiles(path);
      await this.uploadFiles(uploadEndpoint, files, onProgress);

      // Step 3: Finalize
      onProgress?.({ stage: 'finalizing', message: 'Finalizing deployment...' });
      await this.client.finalizeDeploy(deployId);

      // Step 4: Stage to adapter (if provided)
      if (adapter || profileId) {
        onProgress?.({ stage: 'staging', message: `Staging to ${adapter || 'adapter'}...` });
        await this.client.fetch(`/v1/deploys/${deployId}/stage`, {
          method: 'POST',
          body: JSON.stringify({
            profileId,
            adapter,
            config,
            target,
          }),
        });
      }

      // Step 5: Activate (if auto-activate)
      let deploy: Deploy;
      let publicUrl: string | undefined;
      let previewUrl: string | undefined;
      let platformDeploymentId: string | undefined;

      if (autoActivate) {
        onProgress?.({ stage: 'activating', message: 'Activating deployment...' });
        const activateResult = await this.client.fetch<any>(`/v1/deploys/${deployId}/activate`, {
          method: 'POST',
          body: JSON.stringify({
            profileId,
            adapter,
            config,
            target,
            comment,
          }),
        });

        deploy = activateResult.deploy;
        publicUrl = activateResult.publicUrl;
        previewUrl = activateResult.previewUrl;
        platformDeploymentId = activateResult.platformDeploymentId;
      } else {
        deploy = await this.client.getDeploy(deployId);
      }

      onProgress?.({ stage: 'complete', message: 'Deployment complete!' });

      return {
        deployId,
        siteId,
        status: deploy.status,
        url: publicUrl || this.client.getPublicUrl(siteId),
        previewUrl,
        platformDeploymentId,
        deploy,
      };
    } catch (error) {
      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==========================================================================
  // Sites Management
  // ==========================================================================

  /**
   * Create a new site
   */
  async createSite(name: string): Promise<Site> {
    return this.client.createSite({ name });
  }

  /**
   * List all sites
   */
  async listSites(): Promise<Site[]> {
    return this.client.listSites();
  }

  /**
   * Get a site by ID
   */
  async getSite(siteId: string): Promise<Site> {
    return this.client.getSite(siteId);
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<void> {
    await this.client.fetch(`/v1/sites/${siteId}`, { method: 'DELETE' });
  }

  // ==========================================================================
  // Deployments Management
  // ==========================================================================

  /**
   * List deployments for a site
   */
  async listDeployments(siteId: string): Promise<Deploy[]> {
    return this.client.listDeploys(siteId);
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deployId: string): Promise<Deploy> {
    return this.client.getDeploy(deployId);
  }

  /**
   * Promote a preview deployment to production
   */
  async promote(options: PromoteOptions): Promise<DeployResult> {
    const { siteId, deployId, profileId, adapter, config, comment } = options;

    const result = await this.client.fetch<any>(`/v1/deploys/${deployId}/activate`, {
      method: 'POST',
      body: JSON.stringify({
        profileId,
        adapter,
        config,
        target: 'production',
        comment,
      }),
    });

    return {
      deployId,
      siteId,
      status: result.deploy.status,
      url: result.publicUrl,
      previewUrl: result.previewUrl,
      platformDeploymentId: result.platformDeploymentId,
      deploy: result.deploy,
    };
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(options: RollbackOptions): Promise<{ success: boolean; deployId: string }> {
    const { siteId, toDeployId, profileId, adapter, config } = options;

    return this.client.fetch(`/v1/sites/${siteId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({
        toDeployId,
        profileId,
        adapter,
        config,
      }),
    });
  }

  // ==========================================================================
  // Sandboxes (Vercel Sandbox, Cloudflare Sandbox)
  // ==========================================================================

  /**
   * Create a sandbox for rapid prototyping and testing.
   * Sandboxes are ephemeral environments perfect for AI agents and code execution.
   * 
   * @example
   * ```typescript
   * // Vercel Sandbox
   * const sandbox = await brail.createSandbox({
   *   provider: 'vercel-sandbox',
   *   path: './my-app',
   *   config: {
   *     token: 'vercel-token',
   *     runtime: 'node22',
   *     vcpus: 2,
   *     startCommand: 'npm start'
   *   }
   * });
   * 
   * // Cloudflare Sandbox
   * const sandbox = await brail.createSandbox({
   *   provider: 'cloudflare-sandbox',
   *   path: './my-app',
   *   config: {
   *     accountId: 'cf-account-id',
   *     apiToken: 'cf-token',
   *     sandboxBinding: 'MY_SANDBOX',
   *     startCommand: 'node server.js'
   *   }
   * });
   * 
   * console.log('Sandbox URL:', sandbox.url);
   * ```
   */
  async createSandbox(options: CreateSandboxOptions): Promise<SandboxResult> {
    const { provider, path, config, siteName } = options;

    // Create a temporary site for the sandbox
    const site = await this.createSite(siteName || `sandbox-${Date.now()}`);

    // Deploy using the sandbox adapter
    const result = await this.deploy({
      siteId: site.id,
      path,
      adapter: provider,
      config,
      autoActivate: true,
    });

    return {
      url: result.previewUrl || result.url!,
      sandboxId: result.platformDeploymentId || result.deployId,
      siteId: site.id,
      deployId: result.deployId,
    };
  }

  // ==========================================================================
  // Connection Profiles
  // ==========================================================================

  /**
   * Create a connection profile (adapter configuration)
   */
  async createProfile(
    siteId: string,
    name: string,
    adapter: string,
    config: Record<string, unknown>
  ): Promise<any> {
    return this.client.fetch(`/v1/sites/${siteId}/profiles`, {
      method: 'POST',
      body: JSON.stringify({ name, adapter, config }),
    });
  }

  /**
   * List connection profiles for a site
   */
  async listProfiles(siteId: string): Promise<any[]> {
    return this.client.fetch(`/v1/sites/${siteId}/profiles`);
  }

  /**
   * Get a connection profile
   */
  async getProfile(siteId: string, profileId: string): Promise<any> {
    return this.client.fetch(`/v1/sites/${siteId}/profiles/${profileId}`);
  }

  /**
   * Update a connection profile
   */
  async updateProfile(
    siteId: string,
    profileId: string,
    updates: { name?: string; config?: Record<string, unknown> }
  ): Promise<any> {
    return this.client.fetch(`/v1/sites/${siteId}/profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a connection profile
   */
  async deleteProfile(siteId: string, profileId: string): Promise<void> {
    await this.client.fetch(`/v1/sites/${siteId}/profiles/${profileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Set default profile for a site
   */
  async setDefaultProfile(siteId: string, profileId: string): Promise<void> {
    await this.client.fetch(`/v1/sites/${siteId}/profiles/${profileId}/default`, {
      method: 'POST',
    });
  }

  // ==========================================================================
  // Domains
  // ==========================================================================

  /**
   * Add a custom domain to a site
   */
  async addDomain(siteId: string, hostname: string): Promise<Domain & { cnameTarget: string }> {
    return this.client.createDomain(siteId, { hostname });
  }

  /**
   * List domains for a site
   */
  async listDomains(siteId: string): Promise<Domain[]> {
    return this.client.fetch(`/v1/sites/${siteId}/domains`);
  }

  /**
   * Remove a domain
   */
  async removeDomain(siteId: string, domainId: string): Promise<void> {
    await this.client.fetch(`/v1/sites/${siteId}/domains/${domainId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // API Tokens
  // ==========================================================================

  /**
   * Create an API token
   */
  async createToken(options: CreateTokenRequest): Promise<{ token: Token; tokenPlain: string }> {
    return this.client.createToken(options);
  }

  /**
   * List API tokens
   */
  async listTokens(): Promise<Token[]> {
    return this.client.listTokens();
  }

  /**
   * Delete an API token
   */
  async deleteToken(tokenId: string): Promise<void> {
    await this.client.deleteToken(tokenId);
  }

  // ==========================================================================
  // Releases
  // ==========================================================================

  /**
   * List releases for a site (deployed versions)
   */
  async listReleases(siteId: string): Promise<any[]> {
    return this.client.fetch(`/v1/sites/${siteId}/releases`);
  }

  /**
   * Delete a release
   */
  async deleteRelease(releaseId: string): Promise<void> {
    await this.client.fetch(`/v1/releases/${releaseId}`, { method: 'DELETE' });
  }

  // ==========================================================================
  // Build Logs
  // ==========================================================================

  /**
   * List build logs for a site
   */
  async listBuildLogs(siteId: string, limit = 50): Promise<any[]> {
    return this.client.listBuildLogs(siteId, limit);
  }

  /**
   * Get build log by ID
   */
  async getBuildLog(buildLogId: string): Promise<any> {
    return this.client.getBuildLog(buildLogId);
  }

  /**
   * Get build log for a deployment
   */
  async getBuildLogByDeploy(deployId: string): Promise<any> {
    return this.client.getBuildLogByDeploy(deployId);
  }

  // ==========================================================================
  // Adapters
  // ==========================================================================

  /**
   * List available adapters
   */
  async listAdapters(): Promise<any[]> {
    return this.client.fetch('/v1/adapters');
  }

  /**
   * Get adapter details
   */
  async getAdapter(adapterName: string): Promise<any> {
    return this.client.fetch(`/v1/adapters/${adapterName}`);
  }

  // ==========================================================================
  // Helpers / Utilities
  // ==========================================================================

  /**
   * Get the API client (for advanced usage)
   */
  getClient(): ApiClient {
    return this.client;
  }

  /**
   * Get public URL for a site
   */
  getPublicUrl(siteId: string, path = ''): string {
    return this.client.getPublicUrl(siteId, path);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async collectFiles(dirPath: string): Promise<Array<{ path: string; content: Buffer }>> {
    const files: Array<{ path: string; content: Buffer }> = [];

    async function scan(currentPath: string, basePath: string) {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        // Skip hidden files and directories (except .well-known)
        if (entry.name.startsWith('.') && entry.name !== '.well-known') {
          continue;
        }

        // Skip common directories
        if (entry.isDirectory() && ['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath, basePath);
        } else if (entry.isFile()) {
          const relativePath = relative(basePath, fullPath).split(sep).join('/');
          const content = await readFile(fullPath);
          files.push({ path: relativePath, content });
        }
      }
    }

    const stats = await stat(dirPath);
    if (stats.isFile()) {
      // Single file
      const content = await readFile(dirPath);
      files.push({ path: dirPath.split(sep).pop()!, content });
    } else {
      // Directory
      await scan(dirPath, dirPath);
    }

    return files;
  }

  private async uploadFiles(
    uploadEndpoint: string,
    files: Array<{ path: string; content: Buffer }>,
    onProgress?: (progress: DeployProgress) => void
  ): Promise<void> {
    const totalFiles = files.length;
    const totalBytes = files.reduce((sum, f) => sum + f.content.length, 0);
    let filesUploaded = 0;
    let bytesUploaded = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('path', file.path);
      formData.append('file', file.content, { filename: file.path.split('/').pop() });

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: this.client.getToken()
          ? { Authorization: `Bearer ${this.client.getToken()}` }
          : {},
        body: formData as any,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload ${file.path}: ${response.statusText}`);
      }

      filesUploaded++;
      bytesUploaded += file.content.length;

      onProgress?.({
        stage: 'uploading',
        filesUploaded,
        totalFiles,
        bytesUploaded,
        totalBytes,
        message: `Uploaded ${filesUploaded}/${totalFiles} files`,
      });
    }
  }
}

// ============================================================================
// Named Exports
// ============================================================================
// Types are already exported above via their interface/type declarations

// Re-export useful types from shared package
export type {
  Site,
  Deploy,
  DeployStatus,
  Domain,
  DomainStatus,
  Token,
  CreateSiteRequest,
  CreateDeployResponse,
  CreateDomainRequest,
  CreateTokenRequest,
} from '@br/shared';

