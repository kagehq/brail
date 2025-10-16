/**
 * Crypto utilities for encrypting/decrypting configuration
 * Uses AES-256-GCM for authenticated encryption
 * Note: This function only works in Node.js environments
 */

interface EncryptedData {
  alg: 'AES-GCM';
  iv: string; // hex
  ciphertext: string; // hex
  tag: string; // hex
}

/**
 * Encrypt a JSON object using AES-256-GCM
 * @param obj Object to encrypt
 * @param key 32-byte encryption key (Buffer)
 * @returns Encrypted data with IV, ciphertext, and auth tag
 */
export function encryptJSON<T>(obj: T, key: Buffer): EncryptedData {
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
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt an encrypted JSON object
 * @param data Encrypted data (from encryptJSON)
 * @param key 32-byte encryption key (Buffer)
 * @returns Decrypted object
 */
export function decryptJSON<T>(data: EncryptedData, key: Buffer): T {
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
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Mask sensitive fields in configuration objects
 * Useful for displaying configs without exposing secrets
 */
export function maskSecrets(config: any): any {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const masked = { ...config };

  const sensitiveFields = [
    'privateKey',
    'secretAccessKey',
    'password',
    'token',
    'apiKey',
    'secret',
  ];

  for (const field of sensitiveFields) {
    if (field in masked && typeof masked[field] === 'string') {
      const value = masked[field];
      if (value.length > 8) {
        masked[field] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
      } else {
        masked[field] = '***';
      }
    }
  }

  return masked;
}

