# 🚀 Brail Production Setup Guide

## Infrastructure Stack
- **Database**: Supabase (PostgreSQL + real-time + auth)
- **Storage**: DigitalOcean Spaces (S3-compatible)
- **Hosting**: Railway (full-stack deployment)

## 1. Supabase Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your database URL and API keys

### Database Configuration
```bash
# Your Supabase database URL will look like:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Run Migrations
```bash
# Update your DATABASE_URL in apps/api/.env
cd apps/api
pnpm prisma migrate deploy
```

## 2. DigitalOcean Spaces Setup

### Create Spaces Bucket
1. Go to [DigitalOcean Spaces](https://cloud.digitalocean.com/spaces)
2. Create new Space in `nyc3` region
3. Generate API keys with Spaces access

### Configuration
```bash
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=brail-deploys
S3_ACCESS_KEY=[YOUR_ACCESS_KEY]
S3_SECRET_KEY=[YOUR_SECRET_KEY]
S3_FORCE_PATH_STYLE=false
```

## 3. Railway Deployment

### Deploy to Railway
1. Connect your GitHub repo to Railway
2. Set environment variables (see below)
3. Deploy both API and Web services

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Storage
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=brail-deploys
S3_ACCESS_KEY=[DO_SPACES_ACCESS_KEY]
S3_SECRET_KEY=[DO_SPACES_SECRET_KEY]
S3_FORCE_PATH_STYLE=false

# Security
SECRET_KEY_256=[32_BYTE_HEX_KEY]
ENCRYPTION_KEY=[ENCRYPTION_KEY]

# URLs
WEB_URL=https://brail.app
PUBLIC_HOST=brail.app
DEV_PUBLIC_BASE=https://api.brail.app

# SSL
ACME_AUTO_SSL=true
ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory

# Adapters
BR_ENABLE_THIRD_PARTY_ADAPTERS=true
ADAPTER_CATALOG_URL=https://catalog.brail.app

# Production
NODE_ENV=production
PORT=3000
```

## 4. Generate Encryption Keys

```bash
# Generate 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key for ACME
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Domain & SSL Setup

1. Point your domain to Railway
2. Configure SSL in Railway dashboard
3. Update environment variables with your domain

## 6. Post-Deployment

1. Run database migrations
2. Test all functionality
3. Set up monitoring (Sentry)
4. Configure backups

## Next Steps

- [ ] Set up Supabase project
- [ ] Configure DigitalOcean Spaces
- [ ] Deploy to Railway
- [ ] Set up custom domain
- [ ] Add monitoring and alerting
- [ ] Implement billing system
