"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDropJson = parseDropJson;
exports.toVercelConfig = toVercelConfig;
exports.toCloudflareFiles = toCloudflareFiles;
const promises_1 = require("fs/promises");
const path_1 = require("path");
/**
 * Parse _drop.json from a files directory
 */
async function parseDropJson(filesDir) {
    try {
        const dropJsonPath = (0, path_1.join)(filesDir, '_drop.json');
        const content = await (0, promises_1.readFile)(dropJsonPath, 'utf-8');
        const parsed = JSON.parse(content);
        return parsed;
    }
    catch (error) {
        // No _drop.json found, return null
        return null;
    }
}
/**
 * Convert _drop.json config to Vercel vercel.json format
 */
function toVercelConfig(drop) {
    if (!drop) {
        return {};
    }
    const vercelConfig = {};
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
function toCloudflareFiles(drop) {
    if (!drop) {
        return {};
    }
    const result = {};
    // Map headers to Cloudflare Pages _headers format
    // Format: https://developers.cloudflare.com/pages/platform/headers/
    if (drop.headers && drop.headers.length > 0) {
        const headerLines = [];
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
        const redirectLines = [];
        for (const redirect of drop.redirects) {
            const statusCode = redirect.statusCode || 301;
            redirectLines.push(`${redirect.source} ${redirect.destination} ${statusCode}`);
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
