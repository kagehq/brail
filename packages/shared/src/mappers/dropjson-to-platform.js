"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNetlifyConfig = exports.toCloudflareFiles = exports.toVercelConfig = exports.parseDropJson = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
function expandBracePatterns(pattern) {
    const match = pattern.match(/\{([^{}]+)\}/);
    if (!match) {
        return [pattern];
    }
    const [token, body] = match;
    const options = body.split(',').map((part) => part.trim()).filter(Boolean);
    const results = [];
    for (const option of options) {
        const replaced = pattern.replace(token, option);
        results.push(...expandBracePatterns(replaced));
    }
    return results;
}
function hasGlob(pattern) {
    return /[*?]/.test(pattern);
}
function convertGlobPattern(pattern, nextParam) {
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
                i += 1;
            }
            else {
                const name = nextParam();
                result += `:${name}`;
            }
            continue;
        }
        result += char;
    }
    return result;
}
function removeCatchAllSegments(source) {
    if (!source.includes('*')) {
        return null;
    }
    const cleaned = source.replace(/\/:([A-Za-z0-9_]+)\*/g, '');
    const normalized = cleaned.replace(/\/\/+/, '/');
    return normalized === '' ? '/' : normalized;
}
function convertPathToVercelSources(path, nextParam) {
    const variants = expandBracePatterns(path);
    const sources = new Set();
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
async function parseDropJson(filesDir) {
    try {
        const dropJsonPath = (0, path_1.join)(filesDir, '_drop.json');
        const content = await (0, promises_1.readFile)(dropJsonPath, 'utf-8');
        const parsed = JSON.parse(content);
        return parsed;
    }
    catch (error) {
        return null;
    }
}
exports.parseDropJson = parseDropJson;
function toVercelConfig(drop) {
    if (!drop) {
        return {};
    }
    const vercelConfig = {};
    const nextParamName = (() => {
        let index = 0;
        return () => `glob${++index}`;
    })();
    if (Array.isArray(drop.redirects) && drop.redirects.length > 0) {
        const redirects = [];
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
        const headers = [];
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
    return vercelConfig;
}
exports.toVercelConfig = toVercelConfig;
function toCloudflareFiles(drop) {
    if (!drop) {
        return {};
    }
    const result = {};
    if (Array.isArray(drop.headers) && drop.headers.length > 0) {
        const headerLines = [];
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
        const redirectLines = [];
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
exports.toCloudflareFiles = toCloudflareFiles;
function toNetlifyConfig(drop) {
    if (!drop) {
        return {};
    }
    const result = {};
    if (Array.isArray(drop.headers) && drop.headers.length > 0) {
        const headerLines = [];
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
        const redirectLines = [];
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
exports.toNetlifyConfig = toNetlifyConfig;
