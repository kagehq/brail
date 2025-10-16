#!/usr/bin/env node

/**
 * Generate a 32-byte encryption key for SECRET_KEY_256
 */

const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated 32-byte encryption key:\n');
console.log(key);
console.log('\nAdd this to your .env file as:');
console.log(`SECRET_KEY_256=${key}\n`);

