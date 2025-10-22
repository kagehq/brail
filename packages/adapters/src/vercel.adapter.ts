import { readFile, readdir, writeFile, access } from "fs/promises";
import { join, relative } from "path";
import type {
  DeployAdapter,
  AdapterContext,
  UploadInput,
  ActivateInput,
  RollbackInput,
  ReleaseInfo,
  ValidationResult,
} from "./types.js";
import {
  toVercelConfig,
  parseDropJson,
} from "./mappers/dropjson-to-platform.js";

interface VercelConfig {
  token: string;
  teamId?: string;
  projectId?: string;
  projectName?: string;
  framework?: string;
}

interface VercelDeploymentFile {
  file: string;
  data: string;
  encoding: "base64";
}

interface VercelDeployment {
  id: string;
  uid: string;
  url: string;
  target?: string;
  created: number;
}

interface VercelProject {
  id: string;
  name: string;
}

const API_BASE_URL = "https://api.vercel.com";
const API_VERSION = "v13";
const MAX_FILES_IN_MEMORY = 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Vercel adapter for deploying to Vercel platform
 * Supports preview and production deployments with promotion
 */
export class VercelAdapter implements DeployAdapter {
  readonly name = "vercel";

  private frameworkMap: Record<string, string | null> = {
    next: "nextjs",
    nuxt: "nuxtjs",
    sveltekit: "sveltekit",
    astro: "astro",
    vite: "vite",
    react: "create-react-app",
    vue: "vue",
    tanstack: null,
    static: null,
  };

  validateConfig(config: unknown): ValidationResult {
    if (!this.isValidConfig(config)) {
      return {
        valid: false,
        reason: "Config must be an object with required token",
      };
    }
    return { valid: true };
  }

  private isValidConfig(config: unknown): config is VercelConfig {
    return (
      typeof config === "object" &&
      config !== null &&
      "token" in config &&
      typeof (config as any).token === "string" &&
      (config as any).token.length > 0
    );
  }

  async upload(
    ctx: AdapterContext,
    input: UploadInput
  ): Promise<{
    destinationRef?: string;
    platformDeploymentId?: string;
    previewUrl?: string;
  }> {
    if (!this.isValidConfig(input.config)) {
      throw new Error("Invalid Vercel configuration");
    }

    const config = input.config;
    const { filesDir, site, target: requestedTarget } = input;
    const target = requestedTarget === "production" ? "production" : "staging";

    ctx.logger.info("[Vercel] Starting deployment...");
    ctx.logger.info(
      `[Vercel] Target: ${requestedTarget || "preview"} -> "${target}"`
    );

    try {
      await this.generateVercelConfig(filesDir, ctx);

      const files = await this.collectFiles(filesDir);
      ctx.logger.info(`[Vercel] Collected ${files.length} files`);

      if (files.length > MAX_FILES_IN_MEMORY) {
        throw new Error(
          `Too many files (${files.length}). Maximum allowed: ${MAX_FILES_IN_MEMORY}`
        );
      }

      const deploymentFiles = await this.prepareDeploymentFiles(files, ctx);

      const projectName = this.sanitizeProjectName(
        config.projectName || site.name
      );
      const projectId =
        config.projectId ||
        (await this.ensureProject(ctx, config, projectName, filesDir));

      const deployment = await this.createDeployment(
        ctx,
        config,
        projectName,
        deploymentFiles,
        target
      );

      ctx.logger.info(`[Vercel] Deployment created: ${deployment.id}`);
      ctx.logger.info(`[Vercel] Preview URL: https://${deployment.url}`);

      return {
        destinationRef: deployment.url,
        platformDeploymentId: deployment.id,
        previewUrl: `https://${deployment.url}`,
      };
    } catch (error) {
      ctx.logger.error(`[Vercel] Deployment failed: ${error}`);
      throw error;
    }
  }

  async activate(ctx: AdapterContext, input: ActivateInput): Promise<void> {
    if (!this.isValidConfig(input.config)) {
      throw new Error("Invalid Vercel configuration");
    }

    const config = input.config;
    const target = (input as any).target || "preview";
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (target === "production" && platformDeploymentId) {
      ctx.logger.info(
        `[Vercel] Promoting deployment ${platformDeploymentId} to production`
      );
      await this.promoteToProduction(ctx, config, platformDeploymentId);
      ctx.logger.info("[Vercel] Deployment promoted to production");
    } else {
      ctx.logger.info("[Vercel] Preview deployment already active");
    }
  }

  async rollback(ctx: AdapterContext, input: RollbackInput): Promise<void> {
    if (!this.isValidConfig(input.config)) {
      throw new Error("Invalid Vercel configuration");
    }

    const config = input.config;
    const platformDeploymentId = (input as any).platformDeploymentId;

    if (!platformDeploymentId) {
      throw new Error("platformDeploymentId is required for Vercel rollback");
    }

    ctx.logger.info(
      `[Vercel] Rolling back to deployment ${platformDeploymentId}`
    );
    await this.promoteToProduction(ctx, config, platformDeploymentId);
    ctx.logger.info("[Vercel] Rollback complete");
  }

  async listReleases(
    ctx: AdapterContext,
    config: unknown
  ): Promise<ReleaseInfo[]> {
    if (!this.isValidConfig(config)) {
      ctx.logger.warn("[Vercel] Invalid config for listing releases");
      return [];
    }

    if (!config.projectId) {
      return [];
    }

    try {
      const response = await this.apiRequest<{
        deployments: VercelDeployment[];
      }>(
        `/${API_VERSION}/deployments?projectId=${config.projectId}&limit=20`,
        config,
        "GET"
      );

      return (response.deployments || []).map((deployment) => ({
        id: deployment.uid || deployment.id,
        status: deployment.target === "production" ? "active" : "staged",
        timestamp: new Date(deployment.created).toISOString(),
      }));
    } catch (error) {
      ctx.logger.error(`[Vercel] Failed to list releases: ${error}`);
      return [];
    }
  }

  async delete(
    ctx: AdapterContext,
    input: {
      deployId: string;
      config: unknown;
      site: { id: string; name: string };
      platformDeploymentId?: string;
    }
  ): Promise<void> {
    if (!this.isValidConfig(input.config)) {
      throw new Error("Invalid Vercel configuration");
    }

    const { platformDeploymentId } = input;

    if (!platformDeploymentId) {
      ctx.logger.warn(
        "[Vercel] No platform deployment ID provided, skipping cleanup"
      );
      return;
    }

    ctx.logger.info(`[Vercel] Deleting deployment ${platformDeploymentId}...`);

    try {
      await this.apiRequest(
        `/${API_VERSION}/deployments/${platformDeploymentId}`,
        input.config,
        "DELETE"
      );
      ctx.logger.info(
        `[Vercel] Successfully deleted deployment ${platformDeploymentId}`
      );
    } catch (error) {
      ctx.logger.warn(`[Vercel] Error deleting deployment: ${error}`);
    }
  }

  private async generateVercelConfig(
    filesDir: string,
    ctx: AdapterContext
  ): Promise<void> {
    try {
      const dropConfig = await parseDropJson(filesDir);
      const vercelConfig = toVercelConfig(dropConfig);

      if (Object.keys(vercelConfig).length > 0) {
        const vercelJsonPath = join(filesDir, "vercel.json");
        await writeFile(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
        ctx.logger.info("[Vercel] Generated vercel.json from _drop.json");
      }
    } catch (error) {
      ctx.logger.warn(`[Vercel] Failed to parse _drop.json: ${error}`);
    }
  }

  private async prepareDeploymentFiles(
    files: Array<{ fullPath: string; relativePath: string }>,
    ctx: AdapterContext
  ): Promise<VercelDeploymentFile[]> {
    const deploymentFiles: VercelDeploymentFile[] = [];

    for (const file of files) {
      const stats = await readFile(file.fullPath);

      if (stats.length > MAX_FILE_SIZE) {
        ctx.logger.warn(
          `[Vercel] Skipping large file: ${file.relativePath} (${stats.length} bytes)`
        );
        continue;
      }

      const content = await readFile(file.fullPath);
      deploymentFiles.push({
        file: file.relativePath,
        data: content.toString("base64"),
        encoding: "base64",
      });
    }

    return deploymentFiles;
  }

  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .substring(0, 100);
  }

  private async ensureProject(
    ctx: AdapterContext,
    config: VercelConfig,
    projectName: string,
    filesDir: string
  ): Promise<string> {
    ctx.logger.info(`[Vercel] Ensuring project exists: ${projectName}`);

    try {
      const project = await this.apiRequest<VercelProject>(
        `/v9/projects/${projectName}`,
        config,
        "GET"
      );
      ctx.logger.info(`[Vercel] Found existing project: ${project.id}`);
      return project.id;
    } catch (error) {
      ctx.logger.info(`[Vercel] Project not found, creating new project`);
    }

    const framework =
      config.framework || (await this.detectFramework(filesDir));
    const frameworkPreset = this.frameworkMap[framework] || null;

    ctx.logger.info(
      `[Vercel] Using framework: ${framework} -> ${frameworkPreset || "Other"}`
    );

    const body: any = {
      name: projectName,
      framework: frameworkPreset,
    };

    if (config.teamId) {
      body.teamId = config.teamId;
    }

    const project = await this.apiRequest<VercelProject>(
      "/v9/projects",
      config,
      "POST",
      body
    );

    ctx.logger.info(`[Vercel] Created project: ${project.id}`);
    return project.id;
  }

  private async detectFramework(filesDir: string): Promise<string> {
    try {
      const packageJsonPath = join(filesDir, "package.json");

      if (await this.fileExists(packageJsonPath)) {
        const content = await readFile(packageJsonPath, "utf-8");
        const pkg = JSON.parse(content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        const frameworkChecks = [
          { dep: "next", framework: "next" },
          { dep: "nuxt", framework: "nuxt" },
          { dep: "@sveltejs/kit", framework: "sveltekit" },
          { dep: "astro", framework: "astro" },
          { dep: "vite", framework: "vite" },
          { dep: "vue", framework: "vue" },
          { dep: "react", framework: "react" },
        ];

        for (const check of frameworkChecks) {
          if (deps[check.dep]) return check.framework;
        }
      }

      const configChecks = [
        {
          files: ["next.config.js", "next.config.mjs", "next.config.ts"],
          framework: "next",
        },
        { files: ["nuxt.config.ts", "nuxt.config.js"], framework: "nuxt" },
        { files: ["astro.config.mjs"], framework: "astro" },
        { files: ["svelte.config.js"], framework: "sveltekit" },
      ];

      for (const check of configChecks) {
        for (const file of check.files) {
          if (await this.fileExists(join(filesDir, file))) {
            return check.framework;
          }
        }
      }

      return "static";
    } catch (error) {
      return "static";
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async createDeployment(
    ctx: AdapterContext,
    config: VercelConfig,
    projectName: string,
    deploymentFiles: VercelDeploymentFile[],
    target: "production" | "staging"
  ): Promise<{ id: string; url: string }> {
    const deploymentBody: any = {
      name: projectName,
      target,
      files: deploymentFiles,
    };

    if (config.teamId) {
      deploymentBody.teamId = config.teamId;
    }

    if (config.projectId || projectName) {
      deploymentBody.project = config.projectId || projectName;
    }

    ctx.logger.info(
      `[Vercel] Creating deployment with ${deploymentFiles.length} files`
    );

    const deployment = await this.apiRequest<VercelDeployment>(
      `/${API_VERSION}/deployments`,
      config,
      "POST",
      deploymentBody
    );

    return {
      id: deployment.id || deployment.uid,
      url: deployment.url,
    };
  }

  private async promoteToProduction(
    ctx: AdapterContext,
    config: VercelConfig,
    deploymentId: string
  ): Promise<void> {
    await this.apiRequest(
      `/${API_VERSION}/deployments/${deploymentId}/promote`,
      config,
      "POST",
      {}
    );
  }

  private async apiRequest<T = any>(
    path: string,
    config: VercelConfig,
    method: string,
    body?: any
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const headers = this.getHeaders(config);

    const options: RequestInit = {
      method,
      headers: {
        ...headers,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vercel API error: ${response.status} ${errorText}`);
    }

    // Handle empty responses (like DELETE)
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  private getHeaders(config: VercelConfig): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
    };

    if (config.teamId) {
      headers["x-vercel-team-id"] = config.teamId;
    }

    return headers;
  }

  private async collectFiles(
    dir: string
  ): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const files: Array<{ fullPath: string; relativePath: string }> = [];

    async function scan(currentPath: string, basePath: string): Promise<void> {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.name.startsWith(".") && entry.name !== ".well-known") {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath, basePath);
        } else if (entry.isFile()) {
          const relativePath = relative(basePath, fullPath).replace(/\\/g, "/");
          files.push({ fullPath, relativePath });
        }
      }
    }

    await scan(dir, dir);
    return files;
  }
}
