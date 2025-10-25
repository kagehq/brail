"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anonymizeIp = anonymizeIp;
exports.anonymizeUA = anonymizeUA;
const crypto_1 = require("crypto");
/**
 * Anonymize IP address using SHA-256 hash (first 16 chars)
 */
function anonymizeIp(ip) {
    return (0, crypto_1.createHash)('sha256').update(ip).digest('hex').slice(0, 16);
}
/**
 * Anonymize User Agent using SHA-256 hash (first 16 chars)
 */
function anonymizeUA(ua) {
    return (0, crypto_1.createHash)('sha256').update(ua).digest('hex').slice(0, 16);
}
