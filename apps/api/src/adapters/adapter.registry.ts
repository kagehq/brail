import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { adapterRegistry, type DeployAdapter } from '@br/adapters';
import { readdirSync } from 'fs';
import { join } from 'path';

export interface AdapterInfo {
  name: string;
  builtIn: boolean;
  version?: string;
}

/**
 * NestJS service wrapping the global adapter registry with community adapter discovery
 */
@Injectable()
export class AdapterRegistry implements OnModuleInit {
  private readonly logger = new Logger(AdapterRegistry.name);
  private communityAdapters: Map<string, { adapter: DeployAdapter; version?: string }> = new Map();

  onModuleInit() {
    // Discover and load community adapters on startup
    this.discoverCommunityAdapters();

    const adapters = adapterRegistry.listAdapters();
    const communityCount = this.communityAdapters.size;
    
    this.logger.log(
      `Registered ${adapters.length} built-in adapters: ${adapters.map((a) => a.name).join(', ')}`,
    );
    
    if (communityCount > 0) {
      this.logger.log(
        `Discovered ${communityCount} community adapters: ${Array.from(this.communityAdapters.keys()).join(', ')}`,
      );
    }
  }

  /**
   * Discover community adapters (br-adapter-*) from node_modules
   */
  private discoverCommunityAdapters() {
    // Check if third-party adapters are enabled
    if (process.env.BR_ENABLE_THIRD_PARTY_ADAPTERS !== 'true') {
      this.logger.log('Third-party adapters disabled (BR_ENABLE_THIRD_PARTY_ADAPTERS !== true)');
      return;
    }

    const searchDirs: string[] = [];

    // Add node_modules directory
    try {
      searchDirs.push(join(process.cwd(), 'node_modules'));
    } catch {
      // Ignore
    }

    // Add custom adapter directories from env
    if (process.env.BR_ADAPTER_DIRS) {
      const customDirs = process.env.BR_ADAPTER_DIRS.split(':').filter(Boolean);
      searchDirs.push(...customDirs);
    }

    for (const searchDir of searchDirs) {
      try {
        const entries = readdirSync(searchDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('br-adapter-')) {
            this.loadCommunityAdapter(join(searchDir, entry.name));
          }
        }
      } catch (error: any) {
        // Directory doesn't exist or can't be read
        this.logger.debug(`Could not scan ${searchDir}: ${error.message}`);
      }
    }
  }

  /**
   * Load a single community adapter package
   */
  private loadCommunityAdapter(adapterPath: string) {
    try {
      // Load package.json for version info
      let version: string | undefined;
      try {
        const pkgPath = join(adapterPath, 'package.json');
        const pkg = require(pkgPath);
        version = pkg.version;
      } catch {
        // No package.json
      }

      // Load the adapter module
      const adapterModule = require(adapterPath);
      const adapterFactory = adapterModule.default || adapterModule;

      if (typeof adapterFactory !== 'function') {
        this.logger.warn(`Invalid adapter at ${adapterPath}: expected a factory function`);
        return;
      }

      // Create adapter instance with timeout protection
      const timeoutMs = 5000;
      const adapter: DeployAdapter = this.withTimeout(() => adapterFactory(), timeoutMs);

      if (!adapter || !adapter.name) {
        this.logger.warn(`Invalid adapter at ${adapterPath}: missing name`);
        return;
      }

      // Store community adapter
      this.communityAdapters.set(adapter.name, { adapter, version });
      
      this.logger.log(`Loaded community adapter: ${adapter.name}${version ? ` v${version}` : ''}`);
    } catch (error: any) {
      this.logger.error(`Failed to load adapter at ${adapterPath}: ${error.message}`);
    }
  }

  /**
   * Execute function with timeout
   */
  private withTimeout<T>(fn: () => T, timeoutMs: number): T {
    const start = Date.now();
    const result = fn();
    const elapsed = Date.now() - start;
    
    if (elapsed > timeoutMs) {
      throw new Error(`Operation exceeded timeout of ${timeoutMs}ms`);
    }
    
    return result;
  }

  getAdapter(name: string): DeployAdapter {
    // Check built-in adapters first
    const builtIn = adapterRegistry.getAdapter(name);
    if (builtIn) {
      return builtIn;
    }

    // Check community adapters
    const community = this.communityAdapters.get(name);
    if (community) {
      return community.adapter;
    }

    throw new Error(`Unknown adapter: ${name}`);
  }

  listAdapters(): AdapterInfo[] {
    const builtIn = adapterRegistry.listAdapters().map(a => ({
      name: a.name,
      builtIn: true,
    }));

    const community = Array.from(this.communityAdapters.entries()).map(([name, info]) => ({
      name,
      builtIn: false,
      version: info.version,
    }));

    return [...builtIn, ...community];
  }
}

