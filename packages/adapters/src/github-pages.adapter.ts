import { readFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ValidationResult,
} from './types.js';

interface GitHubPagesConfig {
  token: string; // GitHub Personal Access Token
  owner: string; // Repository owner (username or org)
  repo: string; // Repository name
  branch?: string; // Branch to deploy to (default: gh-pages)
  buildDir?: string; // Directory within repo (default: root)
}

/**
 * GitHub Pages adapter for deploying via GitHub API
 * Creates commits to gh-pages branch with deployment files
 */
export class GitHubPagesAdapter implements DeployAdapter {
  name = 'github-pages';

  private readonly API_BASE = 'https://api.github.com';

  validateConfig(config: unknown): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, reason: 'Config must be an object' };
    }

    const c = config as Partial<GitHubPagesConfig>;

    if (!c.token || typeof c.token !== 'string') {
      return { valid: false, reason: 'token is required (GitHub Personal Access Token)' };
    }

    if (!c.owner || typeof c.owner !== 'string') {
      return { valid: false, reason: 'owner is required (GitHub username or org)' };
    }

    if (!c.repo || typeof c.repo !== 'string') {
      return { valid: false, reason: 'repo is required (repository name)' };
    }

    return { valid: true };
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ destinationRef?: string; previewUrl?: string }> {
    const config = input.config as GitHubPagesConfig;
    const { deployId, filesDir } = input;

    const branch = config.branch || 'gh-pages';
    const buildDir = config.buildDir || '';

    ctx.logger.info('[GitHub Pages] Starting deployment...');

    // Get current branch ref
    let branchSha: string | null = null;
    try {
      const refResponse = await this.githubRequest(
        ctx,
        config,
        'GET',
        `/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`,
      );
      branchSha = refResponse.object.sha;
      ctx.logger.info(`[GitHub Pages] Found existing branch: ${branch}`);
    } catch {
      ctx.logger.info(`[GitHub Pages] Branch ${branch} doesn't exist, will create it`);
    }

    // Get base tree
    let baseTreeSha: string | null = null;
    if (branchSha) {
      const commitResponse = await this.githubRequest(
        ctx,
        config,
        'GET',
        `/repos/${config.owner}/${config.repo}/git/commits/${branchSha}`,
      );
      baseTreeSha = commitResponse.tree.sha;
    }

    // Collect files and create blobs
    ctx.logger.info('[GitHub Pages] Uploading files...');
    const files = await this.collectFiles(filesDir);
    const treeItems = [];

    for (const file of files) {
      const content = await readFile(file.fullPath);
      
      // Create blob
      const blobResponse = await this.githubRequest(
        ctx,
        config,
        'POST',
        `/repos/${config.owner}/${config.repo}/git/blobs`,
        {
          content: content.toString('base64'),
          encoding: 'base64',
        },
      );

      const filePath = buildDir
        ? `${buildDir}/${file.relativePath}`
        : file.relativePath;

      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobResponse.sha,
      });

      ctx.logger.debug(`[GitHub Pages] Created blob for ${file.relativePath}`);
    }

    ctx.logger.info(`[GitHub Pages] Created ${treeItems.length} blobs`);

    // Create tree
    const treeResponse = await this.githubRequest(
      ctx,
      config,
      'POST',
      `/repos/${config.owner}/${config.repo}/git/trees`,
      {
        base_tree: baseTreeSha,
        tree: treeItems,
      },
    );

    ctx.logger.info('[GitHub Pages] Created tree');

    // Create commit
    const commitMessage = `Deploy ${deployId} via Brail\n\nDeployed at ${new Date().toISOString()}`;
    const commitResponse = await this.githubRequest(
      ctx,
      config,
      'POST',
      `/repos/${config.owner}/${config.repo}/git/commits`,
      {
        message: commitMessage,
        tree: treeResponse.sha,
        parents: branchSha ? [branchSha] : [],
      },
    );

    ctx.logger.info('[GitHub Pages] Created commit');

    // Update reference (or create branch)
    if (branchSha) {
      await this.githubRequest(
        ctx,
        config,
        'PATCH',
        `/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`,
        {
          sha: commitResponse.sha,
          force: false,
        },
      );
    } else {
      await this.githubRequest(
        ctx,
        config,
        'POST',
        `/repos/${config.owner}/${config.repo}/git/refs`,
        {
          ref: `refs/heads/${branch}`,
          sha: commitResponse.sha,
        },
      );
    }

    ctx.logger.info(`[GitHub Pages] Updated branch: ${branch}`);

    // Trigger Pages build
    try {
      await this.githubRequest(
        ctx,
        config,
        'POST',
        `/repos/${config.owner}/${config.repo}/pages/builds`,
      );
      ctx.logger.info('[GitHub Pages] Triggered Pages build');
    } catch (error: any) {
      ctx.logger.warn('[GitHub Pages] Could not trigger build (may not be enabled)');
    }

    const url = `https://${config.owner}.github.io/${config.repo}`;

    return {
      destinationRef: `${config.owner}/${config.repo}#${branch}`,
      previewUrl: url,
    };
  }

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    // GitHub Pages activates automatically when branch is updated
    ctx.logger.info('[GitHub Pages] Deployment is live (auto-activated)');
  }

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    const config = input.config as GitHubPagesConfig;
    const { toDeployId } = input;

    ctx.logger.info('[GitHub Pages] Rollback via force push...');

    const branch = config.branch || 'gh-pages';

    // To rollback, we need to find the commit with the deployId
    // This is a simplified implementation - in production you'd want to
    // store commit SHAs in your database

    ctx.logger.warn(
      '[GitHub Pages] Rollback requires manual intervention or stored commit references',
    );
    ctx.logger.warn(
      `[GitHub Pages] Use: git push -f origin <commit-sha>:${branch}`,
    );

    throw new Error('Rollback not fully automated for GitHub Pages adapter');
  }

  /**
   * Collect all files recursively
   */
  private async collectFiles(
    dir: string,
  ): Promise<Array<{ relativePath: string; fullPath: string }>> {
    const files: Array<{ relativePath: string; fullPath: string }> = [];

    const scan = async (currentDir: string) => {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories
          if (entry.name.startsWith('.')) continue;
          await scan(fullPath);
        } else if (entry.isFile()) {
          // Skip hidden files
          if (entry.name.startsWith('.')) continue;

          const relativePath = relative(dir, fullPath).replace(/\\/g, '/');
          files.push({ relativePath, fullPath });
        }
      }
    };

    await scan(dir);
    return files;
  }

  /**
   * Make GitHub API request
   */
  private async githubRequest(
    ctx: AdapterContext,
    config: GitHubPagesConfig,
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    const url = `${this.API_BASE}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Brail-Adapter',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `GitHub API error (${response.status}): ${error}`,
      );
    }

    if (response.status === 204) {
      return {}; // No content
    }

    return response.json();
  }
}

