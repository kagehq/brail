#!/bin/bash

# Railway Deployment Script for Brail SaaS
echo "🚀 Deploying Brail to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Create new project
echo "📦 Creating Railway project..."
railway project create brail-saas

# Set environment variables
echo "🔧 Setting environment variables..."

# Database (Supabase)
railway variables set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Storage (DigitalOcean Spaces)
railway variables set S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
railway variables set S3_REGION="nyc3"
railway variables set S3_BUCKET="brail-deploys"
railway variables set S3_ACCESS_KEY="[DO_SPACES_ACCESS_KEY]"
railway variables set S3_SECRET_KEY="[DO_SPACES_SECRET_KEY]"
railway variables set S3_FORCE_PATH_STYLE="false"

# Security
railway variables set SECRET_KEY_256="[32_BYTE_HEX_KEY]"
railway variables set ENCRYPTION_KEY="[ENCRYPTION_KEY]"

# URLs
railway variables set WEB_URL="https://brail.app"
railway variables set PUBLIC_HOST="brail.app"
railway variables set DEV_PUBLIC_BASE="https://api.brail.app"

# SSL
railway variables set ACME_AUTO_SSL="true"
railway variables set ACME_DIRECTORY_URL="https://acme-v02.api.letsencrypt.org/directory"

# Adapters
railway variables set BR_ENABLE_THIRD_PARTY_ADAPTERS="true"
railway variables set ADAPTER_CATALOG_URL="https://catalog.brail.app"

# Production
railway variables set NODE_ENV="production"
railway variables set PORT="3000"

echo "✅ Environment variables set!"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "🎉 Deployment complete!"
echo "📝 Don't forget to:"
echo "   1. Update your domain DNS to point to Railway"
echo "   2. Run database migrations: railway run pnpm db:deploy"
echo "   3. Test all functionality"
echo "   4. Set up monitoring and alerting"
