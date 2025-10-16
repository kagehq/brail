/**
 * Adapter context for logging and temp directory access
 */
export interface AdapterContext {
  logger: {
    info(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
    warn(...args: any[]): void;
  };
  tmpDir?: string;
}

/**
 * Input for uploading a deployment
 */
export interface UploadInput {
  deployId: string;
  filesDir: string; // path to local staged directory
  config: unknown; // adapter-specific config (already decrypted & validated)
  site: {
    id: string;
    name: string;
  };
}

/**
 * Input for activating a deployment
 */
export interface ActivateInput {
  deployId: string;
  config: unknown;
  site: {
    id: string;
    name: string;
  };
  target?: 'preview' | 'production';
  platformDeploymentId?: string;
}

/**
 * Input for rolling back to a previous deployment
 */
export interface RollbackInput {
  toDeployId: string;
  config: unknown;
  site: {
    id: string;
    name: string;
  };
  platformDeploymentId?: string;
}

/**
 * Release information
 */
export interface ReleaseInfo {
  id: string;
  timestamp: string;
  status: 'active' | 'staged' | 'failed';
}

/**
 * Validation result
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Core adapter interface for deployment destinations
 */
export interface DeployAdapter {
  /** Adapter name (unique identifier) */
  name: string;

  /** Validate adapter-specific configuration */
  validateConfig(config: unknown): ValidationResult;

  /** Upload files to destination */
  upload(
    ctx: AdapterContext,
    input: UploadInput,
  ): Promise<{ 
    destinationRef?: string;
    platformDeploymentId?: string;
    previewUrl?: string;
  }>;

  /** Activate a staged deployment */
  activate(ctx: AdapterContext, input: ActivateInput): Promise<void>;

  /** Rollback to a previous deployment */
  rollback(ctx: AdapterContext, input: RollbackInput): Promise<void>;

  /** List releases at destination (optional) */
  listReleases?(
    ctx: AdapterContext,
    config: unknown,
  ): Promise<ReleaseInfo[]>;

  /** Cleanup old releases (optional) */
  cleanupOld?(
    ctx: AdapterContext,
    config: unknown,
    keep: number,
  ): Promise<void>;
}

