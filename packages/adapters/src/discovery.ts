/**
 * Community adapter discovery
 * Scans for third-party adapters (brail-adapter-*)
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { DeployAdapter } from './types.js';
import { adapterRegistry } from './index.js';

const ADAPTER_PREFIX = 'brail-adapter-';
const ENABLE_ENV_VAR = 'BRAIL_ENABLE_THIRD_PARTY_ADAPTERS';
const ADAPTER_DIRS_ENV_VAR = 'BRAIL_ADAPTER_DIRS';

export interface DiscoveryResult {
  loaded: number;
  failed: Array<{ name: string; error: string }>;
  adapters: string[];
}

/**
 * Discover and load community adapters
 */
export async function discoverAdapters(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    loaded: 0,
    failed: [],
    adapters: [],
  };

  // Check if third-party adapters are enabled
  if (process.env[ENABLE_ENV_VAR] !== 'true') {
    return result;
  }

  // Get search directories
  const searchDirs = getSearchDirectories();

  for (const dir of searchDirs) {
    if (!existsSync(dir)) {
      continue;
    }

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith(ADAPTER_PREFIX)) {
          continue;
        }

        const adapterName = entry.name;
        const adapterPath = join(dir, adapterName);

        try {
          const adapter = await loadAdapter(adapterPath, adapterName);

          if (adapter) {
            adapterRegistry.register(adapter);
            result.loaded++;
            result.adapters.push(adapter.name);
          }
        } catch (error: any) {
          result.failed.push({
            name: adapterName,
            error: error.message,
          });
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  return result;
}

/**
 * Get directories to search for adapters
 */
function getSearchDirectories(): string[] {
  const dirs: string[] = [];

  // Custom directories from env var
  const customDirs = process.env[ADAPTER_DIRS_ENV_VAR];
  if (customDirs) {
    dirs.push(...customDirs.split(':').filter(d => d.trim()));
  }

  // Default: node_modules in current directory
  const nodeModules = join(process.cwd(), 'node_modules');
  if (existsSync(nodeModules)) {
    dirs.push(nodeModules);
  }

  // Parent directory node_modules (for monorepos)
  const parentNodeModules = join(process.cwd(), '..', 'node_modules');
  if (existsSync(parentNodeModules)) {
    dirs.push(parentNodeModules);
  }

  // Global node_modules (if NODE_PATH set)
  if (process.env.NODE_PATH) {
    dirs.push(...process.env.NODE_PATH.split(':'));
  }

  return [...new Set(dirs)]; // Remove duplicates
}

/**
 * Load a single adapter
 */
async function loadAdapter(
  adapterPath: string,
  adapterName: string,
): Promise<DeployAdapter | null> {
  // Try to find entry point
  const packageJson = join(adapterPath, 'package.json');

  if (!existsSync(packageJson)) {
    throw new Error('package.json not found');
  }

  // Read package.json to get entry point
  const pkg = JSON.parse(
    require('fs').readFileSync(packageJson, 'utf-8'),
  );

  // Determine entry point
  let entryPoint: string;

  if (pkg.exports && pkg.exports['.']) {
    // Use exports field if available
    const exportEntry = pkg.exports['.'];
    entryPoint = typeof exportEntry === 'string'
      ? exportEntry
      : exportEntry.import || exportEntry.default || exportEntry.require;
  } else {
    // Fallback to main field
    entryPoint = pkg.main || 'index.js';
  }

  const fullEntryPath = join(adapterPath, entryPoint);

  if (!existsSync(fullEntryPath)) {
    throw new Error(`Entry point not found: ${entryPoint}`);
  }

  // Dynamic import
  let module: any;

  try {
    module = await import(fullEntryPath);
  } catch (error: any) {
    throw new Error(`Failed to import: ${error.message}`);
  }

  // Extract adapter
  const adapter =
    module.default || // Default export
    module.adapter || // Named export 'adapter'
    module; // Module itself

  // Validate adapter interface
  if (!isValidAdapter(adapter)) {
    throw new Error('Invalid adapter interface');
  }

  // Validate adapter name matches package
  const expectedAdapterName = adapterName.replace(ADAPTER_PREFIX, '');
  if (adapter.name !== expectedAdapterName) {
    throw new Error(
      `Adapter name mismatch: expected "${expectedAdapterName}", got "${adapter.name}"`,
    );
  }

  return adapter;
}

/**
 * Validate adapter interface
 */
function isValidAdapter(obj: any): obj is DeployAdapter {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.validateConfig === 'function' &&
    typeof obj.upload === 'function' &&
    typeof obj.activate === 'function'
  );
}

/**
 * List all registered adapters (built-in + community)
 */
export function listAllAdapters(): Array<{
  name: string;
  isBuiltIn: boolean;
}> {
  const builtInAdapters = [
    'ssh-rsync',
    's3',
    'ftp',
    'vercel',
    'cloudflare-pages',
    'netlify',
    'railway',
    'fly',
    'github-pages',
    'render',
    'cloudflare-sandbox',
    'vercel-sandbox',
  ];

  return adapterRegistry.listAdapters().map(adapter => ({
    name: adapter.name,
    isBuiltIn: builtInAdapters.includes(adapter.name),
  }));
}

