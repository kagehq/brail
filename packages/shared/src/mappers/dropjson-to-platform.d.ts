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
