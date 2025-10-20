# 🚀 Production Setup

## Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Storage**: DigitalOcean Spaces (S3-compatible)
- **Hosting**: Railway (Dockerized)
- **Email**: Resend (magic link authentication)

## 1. Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection Pooling**
3. Copy the **Transaction mode** connection string (required for Railway)

```bash
# ⚠️ Use the Connection Pooler URL (not direct connection)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. Apply the database schema:
   - Go to **SQL Editor** in Supabase
   - Run the migration SQL (see `apps/api/prisma/schema.prisma` or generate with `pnpm prisma migrate dev`)

## 2. DigitalOcean Spaces

1. Create a Space at [DigitalOcean](https://cloud.digitalocean.com/spaces)
2. Generate API keys with Spaces access

```bash
S3_ENDPOINT=https://[region].digitaloceanspaces.com
S3_REGION=sfo3  # or your region
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=[YOUR_ACCESS_KEY]
S3_SECRET_KEY=[YOUR_SECRET_KEY]
S3_FORCE_PATH_STYLE=false
```

## 3. Resend Email

1. Sign up at [resend.com](https://resend.com)
2. Create an API key

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

## 4. Railway Deployment

### Required Environment Variables

**API Service:**
```bash
# Database (Connection Pooler!)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Storage
S3_ENDPOINT=https://[region].digitaloceanspaces.com
S3_REGION=sfo3
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=[DO_ACCESS_KEY]
S3_SECRET_KEY=[DO_SECRET_KEY]
S3_FORCE_PATH_STYLE=false

# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SECRET_KEY_256=[32_BYTE_HEX]
ENCRYPTION_KEY=[32_BYTE_HEX]
JWT_SECRET=[32_BYTE_HEX]

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# URLs (update after deployment)
WEB_URL=https://your-web-service.railway.app
PUBLIC_HOST=your-api-service.railway.app
DEV_PUBLIC_BASE=https://your-api-service.railway.app

# Environment
NODE_ENV=production
PORT=3000
```

**Web Service:**
```bash
# API URL (update after API deployment)
NUXT_PUBLIC_API_URL=https://your-api-service.railway.app/v1

# Environment
NODE_ENV=production
```

### Deployment Steps

1. Connect your GitHub repo to Railway
2. Create two services: **API** and **Web**
3. For both services, go to **Settings → Builder** and select **"Dockerfile"**
4. Add environment variables to each service
5. Deploy!

## Troubleshooting

### API can't connect to database
- ✅ Make sure you're using the **Connection Pooler URL** (port 6543, has `pgbouncer=true`)
- ✅ Check that Railway has the correct `DATABASE_URL` environment variable

### Web service build fails
- ✅ Ensure `NUXT_PUBLIC_API_URL` is set
- ✅ Check Railway is using the Dockerfile builder

### Storage errors
- ✅ Verify S3 credentials and bucket name
- ✅ Check bucket CORS settings in DigitalOcean

## Current Status

✅ **Dockerfile**: Optimized for Railway (Debian-slim for Prisma compatibility)  
✅ **pnpm Workspace**: Properly configured for monorepo builds  
✅ **Environment Variables**: All required vars documented  
⚠️ **Database Connection**: Needs Connection Pooler URL in Railway  

## Next Steps

- [ ] Update Railway `DATABASE_URL` to use Supabase Connection Pooler
- [ ] Set up custom domain in Railway
- [ ] Configure SSL/TLS
- [ ] Add monitoring (optional)

