/**
 * Crypto utilities for encrypting/decrypting configuration
 * Uses AES-256-GCM for authenticated encryption
 * Note: This function only works in Node.js environments
 */
interface EncryptedData {
    alg: 'AES-GCM';
    iv: string;
    ciphertext: string;
    tag: string;
}
/**
 * Encrypt a JSON object using AES-256-GCM
 * @param obj Object to encrypt
 * @param key 32-byte encryption key (Buffer)
 * @returns Encrypted data with IV, ciphertext, and auth tag
 */
export declare function encryptJSON<T>(obj: T, key: Buffer): EncryptedData;
/**
 * Decrypt an encrypted JSON object
 * @param data Encrypted data (from encryptJSON)
 * @param key 32-byte encryption key (Buffer)
 * @returns Decrypted object
 */
export declare function decryptJSON<T>(data: EncryptedData, key: Buffer): T;
/**
 * Mask sensitive fields in configuration objects
 * Useful for displaying configs without exposing secrets
 */
export declare function maskSecrets(config: any): any;
/**
 * Encrypt a string value using AES-256-GCM
 * @param plaintext String to encrypt
 * @param key 32-byte encryption key (Buffer or hex string)
 * @returns Base64-encoded encrypted string (format: iv:tag:ciphertext)
 */
export declare function encryptValue(plaintext: string, key: Buffer | string): string;
/**
 * Decrypt a string value encrypted with encryptValue
 * @param encrypted Base64-encoded encrypted string (format: iv:tag:ciphertext)
 * @param key 32-byte encryption key (Buffer or hex string)
 * @returns Decrypted plaintext string
 */
export declare function decryptValue(encrypted: string, key: Buffer | string): string;
/**
 * Get encryption key from environment variable
 * @returns 32-byte Buffer for use with encryption functions
 */
export declare function getEncryptionKey(): Buffer;
export {};
