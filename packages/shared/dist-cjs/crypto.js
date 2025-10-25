"use strict";
/**
 * Crypto utilities for encrypting/decrypting configuration
 * Uses AES-256-GCM for authenticated encryption
 * Note: This function only works in Node.js environments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptJSON = encryptJSON;
exports.decryptJSON = decryptJSON;
exports.maskSecrets = maskSecrets;
exports.encryptValue = encryptValue;
exports.decryptValue = decryptValue;
exports.getEncryptionKey = getEncryptionKey;
/**
 * Encrypt a JSON object using AES-256-GCM
 * @param obj Object to encrypt
 * @param key 32-byte encryption key (Buffer)
 * @returns Encrypted data with IV, ciphertext, and auth tag
 */
function encryptJSON(obj, key) {
    try {
        // @ts-ignore - dynamic require for Node.js only
        const crypto = typeof require !== 'undefined' ? require('crypto') : null;
        if (!crypto) {
            throw new Error('encryptJSON is only available in Node.js environments');
        }
        // Generate random IV (12 bytes for GCM)
        const iv = crypto.randomBytes(12);
        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        // Encrypt
        const jsonStr = JSON.stringify(obj);
        let ciphertext = cipher.update(jsonStr, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        // Get auth tag
        const tag = cipher.getAuthTag();
        return {
            alg: 'AES-GCM',
            iv: iv.toString('hex'),
            ciphertext,
            tag: tag.toString('hex'),
        };
    }
    catch (error) {
        throw new Error(`Encryption failed: ${error}`);
    }
}
/**
 * Decrypt an encrypted JSON object
 * @param data Encrypted data (from encryptJSON)
 * @param key 32-byte encryption key (Buffer)
 * @returns Decrypted object
 */
function decryptJSON(data, key) {
    try {
        // @ts-ignore - dynamic require for Node.js only
        const crypto = typeof require !== 'undefined' ? require('crypto') : null;
        if (!crypto) {
            throw new Error('decryptJSON is only available in Node.js environments');
        }
        if (data.alg !== 'AES-GCM') {
            throw new Error(`Unsupported algorithm: ${data.alg}`);
        }
        // Parse hex strings
        const iv = Buffer.from(data.iv, 'hex');
        const tag = Buffer.from(data.tag, 'hex');
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        // Decrypt
        let plaintext = decipher.update(data.ciphertext, 'hex', 'utf8');
        plaintext += decipher.final('utf8');
        return JSON.parse(plaintext);
    }
    catch (error) {
        throw new Error(`Decryption failed: ${error}`);
    }
}
/**
 * Mask sensitive fields in configuration objects
 * Useful for displaying configs without exposing secrets
 */
function maskSecrets(config) {
    if (!config || typeof config !== 'object') {
        return config;
    }
    const masked = { ...config };
    const sensitiveFields = [
        'privateKey',
        'secretAccessKey',
        'password',
        'token',
        'apiToken',
        'apiKey',
        'secret',
    ];
    for (const field of sensitiveFields) {
        if (field in masked && typeof masked[field] === 'string') {
            const value = masked[field];
            if (value.length > 8) {
                masked[field] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
            }
            else {
                masked[field] = '***';
            }
        }
    }
    return masked;
}
/**
 * Encrypt a string value using AES-256-GCM
 * @param plaintext String to encrypt
 * @param key 32-byte encryption key (Buffer or hex string)
 * @returns Base64-encoded encrypted string (format: iv:tag:ciphertext)
 */
function encryptValue(plaintext, key) {
    try {
        // @ts-ignore - dynamic require for Node.js only
        const crypto = typeof require !== 'undefined' ? require('crypto') : null;
        if (!crypto) {
            throw new Error('encryptValue is only available in Node.js environments');
        }
        // Convert key if it's a hex string
        const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
        if (keyBuffer.length !== 32) {
            throw new Error('Encryption key must be 32 bytes');
        }
        // Generate random IV (12 bytes for GCM)
        const iv = crypto.randomBytes(12);
        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
        // Encrypt
        let ciphertext = cipher.update(plaintext, 'utf8');
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        // Get auth tag
        const tag = cipher.getAuthTag();
        // Combine: iv:tag:ciphertext (all base64)
        const combined = Buffer.concat([iv, tag, ciphertext]);
        return combined.toString('base64');
    }
    catch (error) {
        throw new Error(`Value encryption failed: ${error}`);
    }
}
/**
 * Decrypt a string value encrypted with encryptValue
 * @param encrypted Base64-encoded encrypted string (format: iv:tag:ciphertext)
 * @param key 32-byte encryption key (Buffer or hex string)
 * @returns Decrypted plaintext string
 */
function decryptValue(encrypted, key) {
    try {
        // @ts-ignore - dynamic require for Node.js only
        const crypto = typeof require !== 'undefined' ? require('crypto') : null;
        if (!crypto) {
            throw new Error('decryptValue is only available in Node.js environments');
        }
        // Convert key if it's a hex string
        const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
        if (keyBuffer.length !== 32) {
            throw new Error('Encryption key must be 32 bytes');
        }
        // Decode from base64
        const combined = Buffer.from(encrypted, 'base64');
        // Extract components (iv: 12 bytes, tag: 16 bytes, rest: ciphertext)
        const iv = combined.slice(0, 12);
        const tag = combined.slice(12, 28);
        const ciphertext = combined.slice(28);
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(tag);
        // Decrypt
        let plaintext = decipher.update(ciphertext, undefined, 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
    }
    catch (error) {
        throw new Error(`Value decryption failed: ${error}`);
    }
}
/**
 * Get encryption key from environment variable
 * @returns 32-byte Buffer for use with encryption functions
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    // Support both hex and base64 formats
    let keyBuffer;
    if (key.length === 64) {
        // Hex format (64 chars = 32 bytes)
        keyBuffer = Buffer.from(key, 'hex');
    }
    else if (key.length === 44) {
        // Base64 format (44 chars = 32 bytes)
        keyBuffer = Buffer.from(key, 'base64');
    }
    else {
        // Raw string - hash it to 32 bytes
        // @ts-ignore
        const crypto = require('crypto');
        keyBuffer = crypto.createHash('sha256').update(key).digest();
    }
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
    }
    return keyBuffer;
}
