#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 Generating production environment variables for Brail SaaS\n');

// Generate encryption keys
const secretKey256 = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('📋 Copy these environment variables to your Railway project:\n');

console.log('# Database (Supabase)');
console.log('DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\n');

console.log('# Storage (DigitalOcean Spaces)');
console.log('S3_ENDPOINT=https://nyc3.digitaloceanspaces.com');
console.log('S3_REGION=nyc3');
console.log('S3_BUCKET=brail-deploys');
console.log('S3_ACCESS_KEY=[DO_SPACES_ACCESS_KEY]');
console.log('S3_SECRET_KEY=[DO_SPACES_SECRET_KEY]');
console.log('S3_FORCE_PATH_STYLE=false\n');

console.log('# Security & Encryption');
console.log(`SECRET_KEY_256=${secretKey256}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);

console.log('# URLs');
console.log('WEB_URL=https://brail.app');
console.log('PUBLIC_HOST=brail.app');
console.log('DEV_PUBLIC_BASE=https://api.brail.app\n');

console.log('# SSL & ACME');
console.log('ACME_AUTO_SSL=true');
console.log('ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory\n');

console.log('# Adapters');
console.log('BR_ENABLE_THIRD_PARTY_ADAPTERS=true');
console.log('ADAPTER_CATALOG_URL=https://catalog.brail.app\n');

console.log('# Production');
console.log('NODE_ENV=production');
console.log('PORT=3000\n');

console.log('⚠️  IMPORTANT: Replace the placeholder values with your actual credentials!');
console.log('   - [PASSWORD]: Your Supabase database password');
console.log('   - [PROJECT_REF]: Your Supabase project reference');
console.log('   - [DO_SPACES_ACCESS_KEY]: Your DigitalOcean Spaces access key');
console.log('   - [DO_SPACES_SECRET_KEY]: Your DigitalOcean Spaces secret key');
