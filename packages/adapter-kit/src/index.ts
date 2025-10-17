/**
 * @br/adapter-kit
 * 
 * Public SDK for building Brail deployment adapters.
 * Third-party adapters should use this package to ensure compatibility.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface AdapterLogger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface AdapterContext {
  logger: AdapterLogger;
  tmpDir?: string;
}

export interface Site {
  id: string;
  name: string;
  orgId?: string;
}

export interface UploadInput {
  deployId: string;
  filesDir: string;
  config: unknown;
  site: Site;
  target?: 'preview' | 'production';
}

export interface ActivateInput {
  deployId: string;
  config: unknown;
  site: Site;
  target?: 'preview' | 'production';
}

export interface RollbackInput {
  toDeployId: string;
  config: unknown;
  site: Site;
}

export interface ReleaseInfo {
  deployId: string;
  active: boolean;
  createdAt?: string;
  platformDeploymentId?: string;
  previewUrl?: string;
}

export interface UploadResult {
  destinationRef?: string;
  platformDeploymentId?: string;
  previewUrl?: string;
}

export interface ValidationResult {
  valid: true;
}

export interface ValidationError {
  valid: false;
  reason: string;
}

export type ValidationResponse = ValidationResult | ValidationError;

// ============================================================================
// Adapter Interface
// ============================================================================

export interface DeployAdapter {
  /** Unique adapter name (e.g., 'ssh-rsync', 's3', 'vercel') */
  name: string;

  /** Validate adapter-specific configuration */
  validateConfig(config: unknown): ValidationResponse;

  /** Upload files to destination */
  upload(ctx: AdapterContext, input: UploadInput): Promise<UploadResult>;

  /** Activate a staged deployment */
  activate(ctx: AdapterContext, input: ActivateInput): Promise<void>;

  /** Rollback to a previous deployment (optional) */
  rollback?(ctx: AdapterContext, input: RollbackInput): Promise<void>;

  /** List releases at destination (optional) */
  listReleases?(ctx: AdapterContext, config: unknown): Promise<ReleaseInfo[]>;

  /** Cleanup old releases (optional) */
  cleanupOld?(ctx: AdapterContext, config: unknown, keep: number): Promise<void>;
}

// ============================================================================
// Adapter Factory
// ============================================================================

export type AdapterFactory = () => DeployAdapter;

/**
 * Define a new adapter using the factory pattern.
 * This helper ensures type safety and proper adapter structure.
 * 
 * @example
 * ```ts
 * export default defineAdapter(() => ({
 *   name: 'my-adapter',
 *   validateConfig(config) {
 *     // validation logic
 *     return { valid: true };
 *   },
 *   async upload(ctx, input) {
 *     // upload logic
 *     return { destinationRef: '...' };
 *   },
 *   async activate(ctx, input) {
 *     // activation logic
 *   },
 * }));
 * ```
 */
export function defineAdapter(factory: AdapterFactory): AdapterFactory {
  return factory;
}

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Create a simple logger that prefixes all messages with the adapter name
 */
export function createLogger(adapterName: string, baseLogger?: AdapterLogger): AdapterLogger {
  const prefix = `[${adapterName}]`;
  
  return {
    info: (msg, ...args) => (baseLogger?.info || console.log)(`${prefix} ${msg}`, ...args),
    error: (msg, ...args) => (baseLogger?.error || console.error)(`${prefix} ${msg}`, ...args),
    warn: (msg, ...args) => (baseLogger?.warn || console.warn)(`${prefix} ${msg}`, ...args),
    debug: (msg, ...args) => (baseLogger?.debug || console.debug)(`${prefix} ${msg}`, ...args),
  };
}

/**
 * Helper to validate required fields in config
 */
export function validateRequired(
  config: any,
  fields: Array<{ name: string; type: string }>
): ValidationResponse {
  if (typeof config !== 'object' || config === null) {
    return { valid: false, reason: 'Config must be an object' };
  }

  for (const field of fields) {
    if (!(field.name in config)) {
      return { valid: false, reason: `Missing required field: ${field.name}` };
    }

    const value = config[field.name];
    const actualType = typeof value;

    if (actualType !== field.type) {
      return {
        valid: false,
        reason: `Field "${field.name}" must be ${field.type}, got ${actualType}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sleep helper for polling/delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = 2,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        onRetry?.(attempt, error);
        const delay = delayMs * Math.pow(backoff, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
