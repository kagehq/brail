/**
 * FlowScope Integration Utilities
 * 
 * Helper functions to route HTTP requests through FlowScope proxy
 * for development debugging.
 * 
 * Usage:
 * ```typescript
 * import { proxyUrl, createFlowScopeFetch } from './flowscope.util';
 * 
 * // Option 1: Wrap URL
 * const url = proxyUrl('https://api.example.com/endpoint');
 * const response = await fetch(url);
 * 
 * // Option 2: Use custom fetch wrapper
 * const flowScopeFetch = createFlowScopeFetch();
 * const response = await flowScopeFetch('https://api.example.com/endpoint');
 * ```
 */

/**
 * Check if FlowScope is enabled
 */
export function isFlowScopeEnabled(): boolean {
  return process.env.FLOWSCOPE_ENABLED === 'true';
}

/**
 * Get FlowScope proxy URL
 */
export function getFlowScopeProxyUrl(): string {
  return process.env.FLOWSCOPE_PROXY_URL || 'http://localhost:4317';
}

/**
 * Wrap a URL to route through FlowScope proxy
 * 
 * @param url - The original URL to proxy
 * @param force - Force proxying even if FLOWSCOPE_ENABLED is false
 * @returns Proxied URL if enabled, original URL otherwise
 * 
 * @example
 * ```typescript
 * const url = proxyUrl('https://api.github.com/repos');
 * const response = await fetch(url);
 * ```
 */
export function proxyUrl(url: string, force = false): string {
  if (!isFlowScopeEnabled() && !force) {
    return url;
  }
  
  const proxyBase = getFlowScopeProxyUrl();
  return `${proxyBase}/proxy/${url}`;
}

/**
 * Create a fetch wrapper that automatically routes through FlowScope
 * 
 * @param force - Force proxying even if FLOWSCOPE_ENABLED is false
 * @returns A fetch function that routes through FlowScope
 * 
 * @example
 * ```typescript
 * const fetch = createFlowScopeFetch();
 * const response = await fetch('https://api.example.com/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ key: 'value' }),
 * });
 * ```
 */
export function createFlowScopeFetch(force = false): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const proxiedUrl = proxyUrl(url, force);
    return fetch(proxiedUrl, init);
  };
}

/**
 * Conditionally wrap fetch for specific services
 * 
 * @example
 * ```typescript
 * // Only proxy external APIs, not internal services
 * const externalFetch = createServiceFetch(['api.github.com', 'api.vercel.com']);
 * const githubData = await externalFetch('https://api.github.com/repos');
 * const vercelData = await externalFetch('https://api.vercel.com/projects');
 * const localData = await externalFetch('http://localhost:3000/health'); // Not proxied
 * ```
 */
export function createServiceFetch(allowedHosts: string[]): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Check if URL matches any allowed host
    const shouldProxy = allowedHosts.some(host => url.includes(host));
    
    const finalUrl = shouldProxy ? proxyUrl(url) : url;
    return fetch(finalUrl, init);
  };
}

/**
 * Logger for FlowScope operations
 */
export const flowScopeLogger = {
  enabled(): boolean {
    return isFlowScopeEnabled();
  },
  
  info(message: string): void {
    if (this.enabled()) {
      console.log(`[FlowScope] ${message}`);
    }
  },
  
  warn(message: string): void {
    if (this.enabled()) {
      console.warn(`[FlowScope] ${message}`);
    }
  },
  
  proxyUrl(original: string, proxied: string): void {
    this.info(`Routing ${original} → ${proxied}`);
  },
};

