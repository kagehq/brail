/**
 * Compute SHA256 hash of a string or buffer
 * Note: This function only works in Node.js environments
 */
export declare function sha256(data: string | Buffer): string;
/**
 * Get MIME type from file extension
 */
export declare function getMimeType(filename: string): string;
/**
 * Format bytes to human-readable string
 */
export declare function formatBytes(bytes: number | bigint | null | undefined): string;
/**
 * Format duration in milliseconds to human-readable string
 */
export declare function formatDuration(ms: number): string;
/**
 * Normalize path separators to forward slashes (POSIX style)
 */
export declare function normalizePath(path: string): string;
/**
 * Generate a random ID
 */
export declare function generateId(prefix?: string): string;
/**
 * Match path against pattern (simple glob-like matching)
 * Supports: *, **, ?
 */
export declare function matchPath(pattern: string, path: string): boolean;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
