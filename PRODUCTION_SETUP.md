# 🚀 Production Setup

## Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Storage**: DigitalOcean Spaces (S3-compatible)
- **Hosting**: Railway (Dockerized)
- **Email**: Resend (magic link authentication)

## 1. Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection Pooling**
3. Copy the **Transaction mode** connection string

**⚠️ CRITICAL: Connection String Format**

Prisma requires a specific format for the Supabase connection pooler. Use this exact format:

```bash
# Option 1: Connection Pooler (Recommended for Railway - handles many connections)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Option 2: Direct Connection (Alternative - for fewer concurrent connections)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# If Option 1 still fails, try removing the pgbouncer parameter:
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Notes:**
- Railway works best with the pooler URL (port 6543)
- If you see "invalid database string" error, try removing `?pgbouncer=true`
- The `connection_limit=1` parameter helps with serverless environments

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
# Database - Try these in order if one doesn't work:
# 1. Pooler with connection_limit (RECOMMENDED)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# 2. Pooler without pgbouncer parameter (if #1 fails with "invalid database string")
# DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

# 3. Direct connection (if pooler doesn't work)
# DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

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

### ❌ "The provided database string is invalid"
This error means Prisma doesn't like a parameter in your `DATABASE_URL`:

1. **Try removing `?pgbouncer=true`** from your connection string:
   ```
   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
2. If that doesn't work, try the **direct connection** (port 5432):
   ```
   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
3. Update the environment variable in Railway and **redeploy**

### ❌ "Can't reach database server"
- ✅ Check that Supabase allows connections from Railway's IP (should be enabled by default)
- ✅ Verify your password is correct (no special characters causing issues)
- ✅ Try switching between pooler (port 6543) and direct (port 5432) connections

### ❌ "Unable to require libquery_engine"
- ✅ Make sure Railway is using the **Dockerfile** builder (not Nixpacks)
- ✅ The Dockerfile uses `node:22-slim` which has proper OpenSSL support

### Web service build fails
- ✅ Ensure `NUXT_PUBLIC_API_URL` is set
- ✅ Check Railway is using the Dockerfile builder
- ✅ Clear build cache if needed: **Settings → Clear Build Cache**

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

