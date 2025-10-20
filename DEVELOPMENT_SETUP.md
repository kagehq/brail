# 🛠️ Local Development Setup

## Environment Variable Mismatch Fix

The storage service now supports both `S3_` and `MINIO_` environment variable prefixes to work with both local MinIO and production S3.

## Local Development Environment

Create `apps/api/.env` with the following variables for local development:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brail

# Storage (MinIO for local development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_BUCKET=brail-deploys
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_FORCE_PATH_STYLE=true

# Security
SECRET_KEY_256=your-32-byte-hex-key-here
ENCRYPTION_KEY=your-encryption-key-here

# URLs
WEB_URL=http://localhost:3001
PUBLIC_HOST=localhost
DEV_PUBLIC_BASE=http://localhost:3000

# SSL (disabled for local)
ACME_AUTO_SSL=false

# Adapters
BR_ENABLE_THIRD_PARTY_ADAPTERS=true

# Development
NODE_ENV=development
PORT=3000
```

## Production Environment

For production, use `S3_` prefixed variables:

```bash
# Storage (S3-compatible for production)
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=brail-deploys
S3_ACCESS_KEY=your-do-spaces-access-key
S3_SECRET_KEY=your-do-spaces-secret-key
S3_FORCE_PATH_STYLE=false
```

## How It Works

The storage service now checks for both naming conventions:

1. **First priority**: `S3_` prefixed variables (for production)
2. **Fallback**: `MINIO_` prefixed variables (for local development)

This allows the same codebase to work with:
- ✅ Local MinIO development
- ✅ Production S3/DigitalOcean Spaces
- ✅ Any S3-compatible storage

## Quick Start

1. **Start local infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Set up environment**:
   ```bash
   # Copy the local development variables above to apps/api/.env
   ```

3. **Start the application**:
   ```bash
   pnpm dev
   ```

## Troubleshooting

If you're still getting "authorization header is malformed" errors:

1. Check that your `.env` file has the correct `MINIO_` variables
2. Ensure MinIO is running: `docker-compose ps`
3. Verify MinIO credentials match your `.env` file
4. Check the logs: `docker-compose logs minio`
