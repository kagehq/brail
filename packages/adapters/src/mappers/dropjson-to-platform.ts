import { readFile } from 'fs/promises';
import { join } from 'path';

export interface DropJsonHeaderConfig {
  path: string;
  set: Record<string, string>;
}

export interface DropJsonRedirectConfig {
  from: string;
  to: string;
  status?: number;
}

export interface DropJsonConfig {
  redirects?: DropJsonRedirectConfig[];
  headers?: DropJsonHeaderConfig[];
}

function expandBracePatterns(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/);
  if (!match) {
    return [pattern];
  }

  const [token, body] = match;
  const options = body.split(',').map((part) => part.trim()).filter(Boolean);

  const results: string[] = [];
  for (const option of options) {
    const replaced = pattern.replace(token, option);
    results.push(...expandBracePatterns(replaced));
  }

  return results;
}

function hasGlob(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

function convertGlobPattern(pattern: string, nextParam: () => string): string {
  let result = '';

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];

    if (char === '*') {
      const isGlobStar = pattern[i + 1] === '*';
      if (isGlobStar) {
        const name = nextParam();
        if (!result.endsWith('/')) {
          result += '/';
        }
        result += `:${name}*`;
        i += 1; // Skip the second *
      } else {
        const name = nextParam();
        result += `:${name}`;
      }
      continue;
    }

    result += char;
  }

  return result;
}

function removeCatchAllSegments(source: string): string | null {
  if (!source.includes('*')) {
    return null;
  }

  const cleaned = source.replace(/\/:([A-Za-z0-9_]+)\*/g, '');
  const normalized = cleaned.replace(/\/\/+/, '/');
  return normalized === '' ? '/' : normalized;
}

function convertPathToVercelSources(path: string, nextParam: () => string): string[] {
  const variants = expandBracePatterns(path);
  const sources = new Set<string>();

  for (const variant of variants) {
    const trimmed = variant.trim();
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    if (!hasGlob(normalized)) {
      sources.add(normalized);
      continue;
    }

    const converted = convertGlobPattern(normalized, nextParam);
    sources.add(converted);

    const withoutCatchAll = removeCatchAllSegments(converted);
    if (withoutCatchAll && withoutCatchAll !== converted) {
      sources.add(withoutCatchAll);
    }
  }

  return Array.from(sources);
}

export async function parseDropJson(filesDir: string): Promise<DropJsonConfig | null> {
  try {
    const dropJsonPath = join(filesDir, '_drop.json');
    const content = await readFile(dropJsonPath, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    return null;
  }
}

export function toVercelConfig(drop: DropJsonConfig | null, includeDefaultRouting = true): any {
  const vercelConfig: any = {};
  const nextParamName = (() => {
    let index = 0;
    return () => `glob${++index}`;
  })();

  if (!drop) {
    // If no _drop.json config and default routing requested, add SPA fallback
    if (includeDefaultRouting) {
      vercelConfig.routes = [
        {
          handle: 'filesystem',
        },
        {
          src: '/(.*)',
          dest: '/index.html',
        },
      ];
    }
    return vercelConfig;
  }

  if (Array.isArray(drop.redirects) && drop.redirects.length > 0) {
    const redirects: Array<{ source: string; destination: string; permanent: boolean; statusCode: number }> = [];

    for (const redirect of drop.redirects) {
      if (!redirect.from || !redirect.to) {
        continue;
      }

      const sources = convertPathToVercelSources(redirect.from, nextParamName);
      for (const source of sources) {
        const statusCode = redirect.status ?? 301;
        const permanent = statusCode === 301 || statusCode === 308;
        redirects.push({
          source,
          destination: redirect.to,
          permanent,
          statusCode,
        });
      }
    }

    if (redirects.length > 0) {
      vercelConfig.redirects = redirects;
    }
  }

  if (Array.isArray(drop.headers) && drop.headers.length > 0) {
    const headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = [];

    for (const header of drop.headers) {
      if (!header.path || !header.set || Object.keys(header.set).length === 0) {
        continue;
      }

      const sources = convertPathToVercelSources(header.path, nextParamName);
      const headerPairs = Object.entries(header.set).map(([key, value]) => ({ key, value }));

      for (const source of sources) {
        headers.push({
          source,
          headers: headerPairs,
        });
      }
    }

    if (headers.length > 0) {
      vercelConfig.headers = headers;
    }
  }

  // Add default SPA routing if not already configured and requested
  if (includeDefaultRouting && !vercelConfig.routes && !vercelConfig.rewrites) {
    vercelConfig.routes = [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ];
  }

  return vercelConfig;
}

export function toCloudflareFiles(drop: DropJsonConfig | null): { _headers?: string; _redirects?: string } {
  if (!drop) {
    return {};
  }

  const result: { _headers?: string; _redirects?: string } = {};

  if (Array.isArray(drop.headers) && drop.headers.length > 0) {
    const headerLines: string[] = [];

    for (const headerGroup of drop.headers) {
      if (!headerGroup.path || !headerGroup.set) {
        continue;
      }

      headerLines.push(headerGroup.path);
      for (const [key, value] of Object.entries(headerGroup.set)) {
        headerLines.push(`  ${key}: ${value}`);
      }
      headerLines.push('');
    }

    if (headerLines.length > 0) {
      result._headers = headerLines.join('\n');
    }
  }

  if (Array.isArray(drop.redirects) && drop.redirects.length > 0) {
    const redirectLines: string[] = [];

    for (const redirect of drop.redirects) {
      if (!redirect.from || !redirect.to) {
        continue;
      }

      const statusCode = redirect.status ?? 301;
      redirectLines.push(`${redirect.from} ${redirect.to} ${statusCode}`);
    }

    if (redirectLines.length > 0) {
      result._redirects = redirectLines.join('\n');
    }
  }

  return result;
}

export function toNetlifyConfig(drop: DropJsonConfig | null): { _headers?: string; _redirects?: string } {
  if (!drop) {
    return {};
  }

  const result: { _headers?: string; _redirects?: string } = {};

  if (Array.isArray(drop.headers) && drop.headers.length > 0) {
    const headerLines: string[] = [];

    for (const headerGroup of drop.headers) {
      if (!headerGroup.path || !headerGroup.set) {
        continue;
      }

      headerLines.push(headerGroup.path);
      for (const [key, value] of Object.entries(headerGroup.set)) {
        headerLines.push(`  ${key}: ${value}`);
      }
      headerLines.push('');
    }

    if (headerLines.length > 0) {
      result._headers = headerLines.join('\n');
    }
  }

  if (Array.isArray(drop.redirects) && drop.redirects.length > 0) {
    const redirectLines: string[] = [];

    for (const redirect of drop.redirects) {
      if (!redirect.from || !redirect.to) {
        continue;
      }

      const statusCode = redirect.status ?? 301;
      redirectLines.push(`${redirect.from} ${redirect.to} ${statusCode}`);
    }

    if (redirectLines.length > 0) {
      result._redirects = redirectLines.join('\n');
    }
  }

  return result;
}

/**
 * Example _drop.json structure for documentation:
 *
 * {
 *   "redirects": [
 *     { "from": "/old-page", "to": "/new-page", "status": 301 }
 *   ],
 *   "headers": [
 *     {
 *       "path": "/static/*.html",
 *       "set": {
 *         "cache-control": "no-store"
 *       }
 *     }
 *   ]
 * }
 */
