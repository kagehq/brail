import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Parsed _drop.json configuration
 */
export interface DropJsonConfig {
  redirects?: Array<{
    source: string;
    destination: string;
    statusCode?: number;
  }>;
  headers?: Array<{
    source: string;
    headers: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

/**
 * Parse _drop.json from a files directory
 */
export async function parseDropJson(filesDir: string): Promise<DropJsonConfig | null> {
  try {
    const dropJsonPath = join(filesDir, '_drop.json');
    const content = await readFile(dropJsonPath, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    // No _drop.json found, return null
    return null;
  }
}

/**
 * Convert _drop.json config to Vercel vercel.json format
 */
export function toVercelConfig(drop: DropJsonConfig | null): any {
  if (!drop) {
    return {};
  }

  const vercelConfig: any = {};

  // Map redirects
  if (drop.redirects && drop.redirects.length > 0) {
    vercelConfig.redirects = drop.redirects.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: (r.statusCode || 301) === 301,
      statusCode: r.statusCode || 301,
    }));
  }

  // Map headers
  if (drop.headers && drop.headers.length > 0) {
    vercelConfig.headers = drop.headers.map((h) => ({
      source: h.source,
      headers: h.headers.map((hdr) => ({
        key: hdr.key,
        value: hdr.value,
      })),
    }));
  }

  return vercelConfig;
}

/**
 * Convert _drop.json config to Cloudflare Pages _headers and _redirects file contents
 */
export function toCloudflareFiles(drop: DropJsonConfig | null): {
  _headers?: string;
  _redirects?: string;
} {
  if (!drop) {
    return {};
  }

  const result: { _headers?: string; _redirects?: string } = {};

  // Map headers to Cloudflare Pages _headers format
  // Format: https://developers.cloudflare.com/pages/platform/headers/
  if (drop.headers && drop.headers.length > 0) {
    const headerLines: string[] = [];

    for (const headerGroup of drop.headers) {
      headerLines.push(headerGroup.source);
      for (const header of headerGroup.headers) {
        headerLines.push(`  ${header.key}: ${header.value}`);
      }
      headerLines.push(''); // blank line between sections
    }

    result._headers = headerLines.join('\n');
  }

  // Map redirects to Cloudflare Pages _redirects format
  // Format: https://developers.cloudflare.com/pages/platform/redirects/
  if (drop.redirects && drop.redirects.length > 0) {
    const redirectLines: string[] = [];

    for (const redirect of drop.redirects) {
      const statusCode = redirect.statusCode || 301;
      redirectLines.push(
        `${redirect.source} ${redirect.destination} ${statusCode}`,
      );
    }

    result._redirects = redirectLines.join('\n');
  }

  return result;
}

/**
 * Convert _drop.json config to Netlify _headers and _redirects file contents
 */
export function toNetlifyConfig(drop: DropJsonConfig | null): {
  _headers?: string;
  _redirects?: string;
} {
  if (!drop) {
    return {};
  }

  const result: { _headers?: string; _redirects?: string } = {};

  // Map headers to Netlify _headers format
  // Format: https://docs.netlify.com/routing/headers/
  if (drop.headers && drop.headers.length > 0) {
    const headerLines: string[] = [];

    for (const headerGroup of drop.headers) {
      headerLines.push(headerGroup.source);
      for (const header of headerGroup.headers) {
        headerLines.push(`  ${header.key}: ${header.value}`);
      }
      headerLines.push(''); // blank line between sections
    }

    result._headers = headerLines.join('\n');
  }

  // Map redirects to Netlify _redirects format
  // Format: https://docs.netlify.com/routing/redirects/
  if (drop.redirects && drop.redirects.length > 0) {
    const redirectLines: string[] = [];

    for (const redirect of drop.redirects) {
      const statusCode = redirect.statusCode || 301;
      redirectLines.push(
        `${redirect.source} ${redirect.destination} ${statusCode}`,
      );
    }

    result._redirects = redirectLines.join('\n');
  }

  return result;
}

/**
 * Example _drop.json structure for documentation:
 * 
 * {
 *   "redirects": [
 *     {
 *       "source": "/old-page",
 *       "destination": "/new-page",
 *       "statusCode": 301
 *     }
 *   ],
 *   "headers": [
 *     {
 *       "source": "/(.*)",
 *       "headers": [
 *         {
 *           "key": "X-Frame-Options",
 *           "value": "DENY"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

