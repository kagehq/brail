export interface DropJsonHeaderConfig {
    path: string;
    set: Record<string, string>;
}
export interface DropJsonRedirectConfig {
    from: string;
    to: string;
    status?: number;
}
/**
 * Parsed _drop.json configuration
 */
export interface DropJsonConfig {
    redirects?: DropJsonRedirectConfig[];
    headers?: DropJsonHeaderConfig[];
}
/**
 * Parse _drop.json from a files directory
 */
export declare function parseDropJson(filesDir: string): Promise<DropJsonConfig | null>;
/**
 * Convert _drop.json config to Vercel vercel.json format
 */
export declare function toVercelConfig(drop: DropJsonConfig | null): any;
/**
 * Convert _drop.json config to Cloudflare Pages _headers and _redirects file contents
 */
export declare function toCloudflareFiles(drop: DropJsonConfig | null): {
    _headers?: string;
    _redirects?: string;
};
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
