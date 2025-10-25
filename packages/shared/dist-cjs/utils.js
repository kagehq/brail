"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.getMimeType = getMimeType;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.normalizePath = normalizePath;
exports.generateId = generateId;
exports.matchPath = matchPath;
exports.sleep = sleep;
/**
 * Compute SHA256 hash of a string or buffer
 * Note: This function only works in Node.js environments
 */
function sha256(data) {
    // Lazy load crypto module for Node.js environments only
    try {
        // @ts-ignore - dynamic require for Node.js only
        const crypto = typeof require !== 'undefined' ? require('crypto') : null;
        if (!crypto) {
            throw new Error('sha256 is only available in Node.js environments');
        }
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    catch (error) {
        throw new Error('sha256 is only available in Node.js environments');
    }
}
/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes = {
        // Text
        'html': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'mjs': 'text/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'txt': 'text/plain',
        'md': 'text/markdown',
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        // Fonts
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'eot': 'application/vnd.ms-fontobject',
        // Media
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        // Documents
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}
/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes == null)
        return 'Unknown';
    const num = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    if (num === 0)
        return '0 B';
    if (isNaN(num))
        return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${(num / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
/**
 * Normalize path separators to forward slashes (POSIX style)
 */
function normalizePath(path) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '');
}
/**
 * Generate a random ID
 */
function generateId(prefix) {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    const id = `${timestamp}${random}`;
    return prefix ? `${prefix}_${id}` : id;
}
/**
 * Match path against pattern (simple glob-like matching)
 * Supports: *, **, ?
 */
function matchPath(pattern, path) {
    // Convert glob pattern to regex
    const regexPattern = pattern
        .replace(/\*\*/g, '___GLOBSTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/___GLOBSTAR___/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\./g, '\\.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
