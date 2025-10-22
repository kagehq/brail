/**
 * EXAMPLE: Adapter Catalog Service with FlowScope Integration
 * 
 * This is an example showing how to integrate FlowScope into the
 * AdapterCatalogService to debug external API calls.
 * 
 * To use this:
 * 1. Copy the relevant parts to your actual service
 * 2. Set FLOWSCOPE_ENABLED=true in apps/api/.env
 * 3. Start FlowScope: cd flowscope && docker-compose up
 * 4. Watch external API calls in FlowScope dashboard
 * 
 * See docs/FLOWSCOPE.md for full integration guide.
 */

import { Injectable, Logger } from '@nestjs/common';
import { proxyUrl, flowScopeLogger } from '../flowscope.util';

export interface AdapterCatalogEntry {
  name: string;
  title: string;
  category: 'traditional' | 'storage' | 'platform' | 'dynamic';
  description: string;
  features: string[];
  docsUrl?: string;
  supportsPreview: boolean;
  supportsProduction: boolean;
}

@Injectable()
export class AdapterCatalogServiceWithFlowScope {
  private readonly logger = new Logger(AdapterCatalogServiceWithFlowScope.name);
  private cache: AdapterCatalogEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  private readonly fallbackCatalog: AdapterCatalogEntry[] = [
    // ... same as original
  ];

  /**
   * List adapters from external catalog with FlowScope debugging
   */
  async listAdapters(): Promise<AdapterCatalogEntry[]> {
    const catalogUrl = process.env.ADAPTER_CATALOG_URL;

    if (!catalogUrl) {
      return this.fallbackCatalog;
    }

    if (this.cache && Date.now() - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cache;
    }

    try {
      // ============================================================
      // FlowScope Integration: Route external URL through proxy
      // ============================================================
      const requestUrl = proxyUrl(catalogUrl);
      
      // Log when FlowScope is active
      if (requestUrl !== catalogUrl) {
        flowScopeLogger.proxyUrl(catalogUrl, requestUrl);
      }
      
      const response = await fetch(requestUrl);
      // ============================================================

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid catalog payload');
      }

      const parsed = data.filter((entry) => typeof entry?.name === 'string');
      this.cache = parsed;
      this.cacheTimestamp = Date.now();
      
      this.logger.log(`Fetched ${parsed.length} adapters from catalog`);
      
      return parsed;
    } catch (error: any) {
      this.logger.warn(
        `Falling back to bundled adapter catalog: ${error?.message || error}`,
      );
      this.cache = this.fallbackCatalog;
      this.cacheTimestamp = Date.now();
      return this.fallbackCatalog;
    }
  }
  
  /**
   * Alternative: Using createFlowScopeFetch wrapper
   */
  async listAdaptersAlternative(): Promise<AdapterCatalogEntry[]> {
    const catalogUrl = process.env.ADAPTER_CATALOG_URL;

    if (!catalogUrl) {
      return this.fallbackCatalog;
    }

    if (this.cache && Date.now() - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cache;
    }

    try {
      // ============================================================
      // FlowScope Integration: Use custom fetch wrapper
      // ============================================================
      const { createFlowScopeFetch } = await import('../flowscope.util');
      const flowScopeFetch = createFlowScopeFetch();
      
      const response = await flowScopeFetch(catalogUrl);
      // ============================================================

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid catalog payload');
      }

      const parsed = data.filter((entry) => typeof entry?.name === 'string');
      this.cache = parsed;
      this.cacheTimestamp = Date.now();
      return parsed;
    } catch (error: any) {
      this.logger.warn(
        `Falling back to bundled adapter catalog: ${error?.message || error}`,
      );
      this.cache = this.fallbackCatalog;
      this.cacheTimestamp = Date.now();
      return this.fallbackCatalog;
    }
  }
}

/**
 * Benefits of FlowScope Integration:
 * 
 * 1. Visual Debugging
 *    - See the exact URL being fetched
 *    - Inspect response body and headers
 *    - Check response time
 * 
 * 2. Error Analysis
 *    - When catalog fetch fails, see the exact error response
 *    - Compare successful vs failed requests
 *    - Debug rate limiting or authentication issues
 * 
 * 3. Performance Monitoring
 *    - Track how long external API calls take
 *    - Identify slow endpoints
 *    - Optimize caching strategy
 * 
 * 4. Testing
 *    - Replay failed requests
 *    - Copy as cURL for terminal testing
 *    - Compare different catalog URLs
 */

