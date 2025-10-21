# Brail Environment Configuration Guide

Complete guide for setting up environment variables for local development and production deployment.

---

## 🚀 API Server (`apps/api/.env`)

### Required Variables

```bash
# ============================================================================
# Database (PostgreSQL / Supabase)
# ============================================================================
# Use transaction pooler (port 6543) with pgbouncer=true for Supabase
DATABASE_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection for Prisma migrations (port 5432, no pooler)
DIRECT_DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# ============================================================================
# Security & Authentication
# ============================================================================
# Generate with: node scripts/generate-key.js
JWT_SECRET="your-jwt-secret-at-least-32-characters-long"
ENCRYPTION_KEY="your-encryption-key-generated-by-script"

# ============================================================================
# Server Configuration
# ============================================================================
NODE_ENV=production  # development | production
PORT=3000

# API's public URL (REQUIRED - used for magic link generation)
# Development: http://localhost:3000
# Railway: https://brail-api-production.up.railway.app
# Custom Domain: https://api.yourdomain.com
API_URL=https://api.yourdomain.com

# Web app URL (REQUIRED - used for CORS and post-login redirects)
# Development: http://localhost:3001
# Production: https://app.yourdomain.com
WEB_URL=https://app.yourdomain.com

# Public hostname (REQUIRED - used for CORS)
# Development: localhost
# Railway: brail-api-production.up.railway.app
# Custom: api.yourdomain.com
PUBLIC_HOST=api.yourdomain.com

# ============================================================================
# Email (Magic Link Authentication)
# ============================================================================
# Get from: https://resend.com/api-keys
# In dev mode, magic links print to console instead
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# ============================================================================
# Storage
# ============================================================================
# Development: ./storage
# Production: /app/storage
STORAGE_PATH=/app/storage

# ============================================================================
# S3-Compatible Storage (AWS S3 / Cloudflare R2 / MinIO)
# ============================================================================
# AWS S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=brail-deployments
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=false

# OR Cloudflare R2
# S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
# S3_FORCE_PATH_STYLE=true

# OR MinIO (local dev)
# S3_ENDPOINT=http://localhost:9000
# S3_ACCESS_KEY=minioadmin
# S3_SECRET_KEY=minioadmin
# S3_BUCKET=brail
# S3_FORCE_PATH_STYLE=true
```

### Optional Variables

```bash
# Development tools
DEV_PUBLIC_BASE=http://localhost:3000
LOG_LEVEL=info

# Let's Encrypt SSL (optional)
ACME_EMAIL=admin@yourdomain.com
ACME_DIRECTORY=https://acme-v02.api.letsencrypt.org/directory

# Alternative names (legacy/compatibility)
SECRET_KEY_256=same-as-encryption-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=brail
MINIO_FORCE_PATH_STYLE=true
```

---

## 🌐 Web App (`apps/web/.env`)

```bash
# API endpoint URL (REQUIRED)
API_URL=https://api.yourdomain.com
NUXT_PUBLIC_API_URL=https://api.yourdomain.com

NODE_ENV=production
```

---

## 📋 Quick Setup

### Local Development

1. **Generate secrets:**
   ```bash
   node scripts/generate-key.js
   ```

2. **Create `apps/api/.env`:**
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost:5432/brail"
   JWT_SECRET="paste-generated-secret-here"
   ENCRYPTION_KEY="paste-generated-key-here"
   NODE_ENV=development
   PORT=3000
   API_URL=http://localhost:3000
   WEB_URL=http://localhost:3001
   PUBLIC_HOST=localhost
   STORAGE_PATH=./storage
   S3_ENDPOINT=http://localhost:9000
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   S3_BUCKET=brail
   S3_FORCE_PATH_STYLE=true
   ```

3. **Create `apps/web/.env`:**
   ```bash
   API_URL=http://localhost:3000
   NUXT_PUBLIC_API_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Setup database:**
   ```bash
   cd apps/api
   pnpm prisma generate
   pnpm prisma migrate deploy
   ```

5. **Start development:**
   ```bash
   cd ../..
   pnpm dev
   ```

6. **Login:** Magic links will appear in your API console

---

## 🚂 Railway Production Setup

### API Service Environment Variables

**Required:**

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `DATABASE_URL` | `postgresql://...pooler.supabase.com:6543/...?pgbouncer=true` | Supabase pooler connection |
| `DIRECT_DATABASE_URL` | `postgresql://...db...supabase.co:5432/...` | Direct connection for migrations |
| `JWT_SECRET` | `a31537a7442a89b0a218314c08f0646f...` | 32+ character secret |
| `ENCRYPTION_KEY` | `a31537a7442a89b0a218314c08f0646f...` | 32+ character key |
| `API_URL` | `https://brail-api.up.railway.app` | Your Railway API domain |
| `WEB_URL` | `https://app.brailhq.com` | Your web app domain |
| `PUBLIC_HOST` | `brail-api.up.railway.app` | API hostname |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | From resend.com |
| `FROM_EMAIL` | `noreply@yourdomain.com` | Verified sender email |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | API port |
| `STORAGE_PATH` | `/app/storage` | Storage directory |

**S3 Configuration (choose one):**

*AWS S3:*
```bash
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=brail-deployments
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=false
```

*Cloudflare R2:*
```bash
S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
S3_ACCESS_KEY=your-r2-access-key
S3_SECRET_KEY=your-r2-secret-key
S3_BUCKET=brail-deployments
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
```

### Web Service Environment Variables

| Variable | Example Value |
|----------|--------------|
| `API_URL` | `https://brail-api.up.railway.app` |
| `NUXT_PUBLIC_API_URL` | `https://brail-api.up.railway.app` |
| `NODE_ENV` | `production` |

### Custom Domains (Railway)

**API Service:**
1. Go to API service → Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Update DNS: `CNAME api → [service].up.railway.app`
4. Update environment variables:
   - `API_URL=https://api.yourdomain.com`
   - `PUBLIC_HOST=api.yourdomain.com`

**Web Service:**
1. Go to Web service → Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Update DNS: `CNAME app → [service].up.railway.app`
4. Update API service: `WEB_URL=https://app.yourdomain.com`
5. Update Web service: `API_URL=https://api.yourdomain.com`

---

## 🔐 Getting Started with Resend (Magic Links)

1. Go to [resend.com](https://resend.com) and create account
2. Verify your domain
3. Create API key
4. Add to your API service:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

---

## 🗄️ Database Setup

### Option 1: SQL Script (Recommended for Supabase)

Run the SQL from `scripts/setup-database.sql` in Supabase SQL Editor.

### Option 2: Prisma Migrations

```bash
cd apps/api
pnpm prisma migrate deploy
```

---

## ✅ Production Deployment Checklist

- [ ] Database URL configured (Supabase pooler with `?pgbouncer=true`)
- [ ] Direct database URL configured
- [ ] JWT secret generated and set (32+ characters)
- [ ] Encryption key generated and set
- [ ] API_URL matches your API domain
- [ ] WEB_URL matches your web domain
- [ ] PUBLIC_HOST matches your API hostname
- [ ] Resend API key configured
- [ ] FROM_EMAIL verified in Resend
- [ ] S3/R2 storage configured
- [ ] NODE_ENV=production
- [ ] Custom domains configured in Railway
- [ ] DNS records updated (CNAME)
- [ ] Database schema deployed
- [ ] Both services redeployed

---

## 🐛 Troubleshooting

### "Invalid or expired token" when clicking magic link

- Check `API_URL` is set correctly
- Check `JWT_SECRET` is the same across restarts
- Check API logs for the magic link URL

### "401 Unauthorized" errors

- Check `API_URL` is set on API service
- Check `WEB_URL` is set on API service (for CORS)
- Check web app has correct `API_URL` or `NUXT_PUBLIC_API_URL`

### "Prepared statement already exists" database error

- Ensure `DATABASE_URL` has `?pgbouncer=true` at the end
- Ensure using port `6543` (pooler) not `5432` (direct)
- Add `DIRECT_DATABASE_URL` for migrations

### Login redirects back to login page

- Check `WEB_URL` is set correctly on API service
- Check cookies are enabled
- Check API and web are on correct domains

---

## 📚 Related Documentation

- [Database Setup Guide](./scripts/DATABASE.md)
- [Detailed Documentation](./docs/DETAILED.md)
- [Main README](./README.md)

