# Brail Platform Connectors

This guide covers deploying to cloud platforms and services via Brail's adapters: **SSH/Rsync**, **S3**, **FTP**, **Vercel**, **Cloudflare Pages**, **Netlify**, **Railway**, **Fly.io**, **GitHub Pages**, **Cloudflare Sandbox**, and **Vercel Sandbox**.

## Overview

Brail's adapter system supports deploying to various platforms from traditional shared hosting to modern serverless platforms and dynamic sandbox environments. These adapters handle:

- **Preview deployments**: Automatic preview URLs for testing (where supported)
- **Production promotion**: One-click promotion from preview to production
- **Rollback support**: Instant rollback to previous deployments
- **Config mapping**: Automatic translation of `_drop.json` to platform-specific configs
- **Traditional protocols**: FTP/FTPS support for shared hosting environments
- **Dynamic sites**: Secure code execution with Cloudflare Sandbox and Vercel Sandbox

## Static & Storage Adapters

### SSH/Rsync Adapter

Deploy to your own servers via SSH with rsync for efficient file transfers.

#### Prerequisites

1. **SSH access**: Server with SSH enabled
2. **SSH key or password**: Authentication credentials
3. **Target directory**: Remote path for deployment

#### Configuration

```bash
# Add SSH profile
br profiles add \
  --site <siteId> \
  --name production-server \
  --adapter ssh-rsync \
  --host server.example.com \
  --user deploy \
  --privateKey @~/.ssh/id_rsa \
  --basePath /var/www/html
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `host` | ✅ | SSH server hostname |
| `port` | ❌ | SSH port (default: 22) |
| `user` | ✅ | SSH username |
| `privateKey` | ✅ | SSH private key path |
| `basePath` | ❌ | Remote deployment path |
| `keepReleases` | ❌ | Number of releases to keep (default: 3) |

### S3 Adapter

Deploy to AWS S3, MinIO, or any S3-compatible storage service.

#### Prerequisites

1. **S3 bucket**: Create a bucket for your site
2. **AWS credentials**: Access key ID and secret access key
3. **Bucket permissions**: Read/write access configured

#### Configuration

```bash
# Add S3 profile
br profiles add \
  --site <siteId> \
  --name s3-production \
  --adapter s3 \
  --bucket my-website-bucket \
  --region us-east-1 \
  --accessKeyId <access-key> \
  --secretAccessKey @~/.secrets/aws.secret
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `bucket` | ✅ | S3 bucket name |
| `region` | ✅ | AWS region |
| `accessKeyId` | ✅ | AWS access key ID |
| `secretAccessKey` | ✅ | AWS secret access key |
| `prefix` | ❌ | Key prefix for files |
| `endpoint` | ❌ | Custom S3 endpoint (for MinIO) |
| `forcePathStyle` | ❌ | Use path-style URLs |

### FTP Adapter

Deploy to traditional shared hosting environments via FTP or FTPS (secure FTP).

#### Prerequisites

1. **FTP credentials**: Host, username, and password from your hosting provider
2. **FTP access enabled**: Some hosts require enabling FTP in the control panel

#### Configuration

```bash
# Add FTP profile
br profiles add \
  --site <siteId> \
  --name shared-hosting \
  --adapter ftp \
  --host ftp.example.com \
  --user myuser \
  --password @~/.secrets/ftp.password \
  --basePath /public_html
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `host` | ✅ | FTP server hostname |
| `port` | ❌ | Port (default: 21) |
| `user` | ✅ | FTP username |
| `password` | ✅ | FTP password |
| `basePath` | ❌ | Remote path (default: `/`) |
| `secure` | ❌ | Use FTPS (default: false) |
| `keepReleases` | ❌ | Number of releases to keep (default: 3) |

## Platform Adapters

### Vercel Adapter

Deploy to Vercel platform with automatic preview URLs and production promotion.

#### Prerequisites

1. **Vercel account**: Sign up at [vercel.com](https://vercel.com)
2. **API token**: Generate from Vercel dashboard
3. **Project setup**: Create or link existing project

#### Configuration

```bash
# Add Vercel profile
br profiles add \
  --site <siteId> \
  --name vercel-prod \
  --adapter vercel \
  --token @~/.secrets/vercel.token \
  --projectName my-website \
  --framework static
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | Vercel API token |
| `projectName` | ❌ | Vercel project name |
| `teamId` | ❌ | Vercel team ID |
| `framework` | ❌ | Framework type (static, nextjs, other) |
| `productionDomain` | ❌ | Custom production domain |

### Cloudflare Pages Adapter

Deploy to Cloudflare Pages with global edge distribution.

#### Prerequisites

1. **Cloudflare account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **API token**: Generate with Pages:Edit permission
3. **Account ID**: Found in Cloudflare dashboard

#### Configuration

```bash
# Add Cloudflare Pages profile
br profiles add \
  --site <siteId> \
  --name cf-pages \
  --adapter cloudflare-pages \
  --accountId <cf-account-id> \
  --apiToken @~/.secrets/cf.token \
  --projectName my-website
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `accountId` | ✅ | Cloudflare account ID |
| `apiToken` | ✅ | Cloudflare API token |
| `projectName` | ❌ | Pages project name |
| `productionDomain` | ❌ | Custom production domain |

### Netlify Adapter

Deploy to Netlify platform with automatic builds and preview URLs.

#### Prerequisites

1. **Netlify account**: Sign up at [netlify.com](https://netlify.com)
2. **API token**: Generate from Netlify dashboard
3. **Site setup**: Create or link existing site

#### Configuration

```bash
# Add Netlify profile
br profiles add \
  --site <siteId> \
  --name netlify-prod \
  --adapter netlify \
  --token @~/.secrets/netlify.token \
  --siteId <netlify-site-id>
```

### Railway Adapter

Deploy to Railway platform with containerized deployments.

#### Prerequisites

1. **Railway account**: Sign up at [railway.app](https://railway.app)
2. **API token**: Generate from Railway dashboard
3. **Project setup**: Create or link existing project

#### Configuration

```bash
# Add Railway profile
br profiles add \
  --site <siteId> \
  --name railway-prod \
  --adapter railway \
  --token @~/.secrets/railway.token \
  --projectId <railway-project-id>
```

### Fly.io Adapter

Deploy to Fly.io platform with global edge deployment.

#### Prerequisites

1. **Fly.io account**: Sign up at [fly.io](https://fly.io)
2. **API token**: Generate from Fly.io dashboard
3. **App setup**: Create or link existing app

#### Configuration

```bash
# Add Fly.io profile
br profiles add \
  --site <siteId> \
  --name fly-prod \
  --adapter fly \
  --token @~/.secrets/fly.token \
  --appName my-website
```

### GitHub Pages Adapter

Deploy to GitHub Pages with automatic builds from repository.

#### Prerequisites

1. **GitHub repository**: Public or private repository
2. **GitHub token**: Personal access token with repo permissions
3. **Pages enabled**: Enable GitHub Pages in repository settings

#### Configuration

```bash
# Add GitHub Pages profile
br profiles add \
  --site <siteId> \
  --name github-pages \
  --adapter github-pages \
  --token @~/.secrets/github.token \
  --repository owner/repo \
  --branch main
```

## Dynamic & Server-side Adapters

### Cloudflare Sandbox Adapter

Deploy dynamic applications with secure code execution using Cloudflare Sandbox.

#### Prerequisites

1. **Cloudflare account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **API token**: Generate with Workers:Edit permission
3. **Account ID**: Found in Cloudflare dashboard

#### Configuration

```bash
# Add Cloudflare Sandbox profile
br profiles add \
  --site <siteId> \
  --name cf-sandbox \
  --adapter cloudflare-sandbox \
  --accountId <cf-account-id> \
  --apiToken @~/.secrets/cf.token \
  --runtime node \
  --buildCommand "npm run build"
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `accountId` | ✅ | Cloudflare account ID |
| `apiToken` | ✅ | Cloudflare API token |
| `runtime` | ❌ | Runtime (node, python, deno) |
| `buildCommand` | ❌ | Build command to run |
| `memory` | ❌ | Memory limit in MB |
| `timeout` | ❌ | Execution timeout in seconds |

### Vercel Sandbox Adapter

Deploy dynamic applications with secure code execution using Vercel Sandbox.

#### Prerequisites

1. **Vercel account**: Sign up at [vercel.com](https://vercel.com)
2. **API token**: Generate from Vercel dashboard
3. **Team and project setup**: Create or link existing project

#### Configuration

```bash
# Add Vercel Sandbox profile
br profiles add \
  --site <siteId> \
  --name vercel-sandbox \
  --adapter vercel-sandbox \
  --teamId <vercel-team-id> \
  --projectId <vercel-project-id> \
  --token @~/.secrets/vercel.token \
  --runtime node22 \
  --vcpus 4
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `teamId` | ✅ | Vercel team ID |
| `projectId` | ✅ | Vercel project ID |
| `token` | ✅ | Vercel API token |
| `runtime` | ❌ | Runtime (node22, python313) |
| `vcpus` | ❌ | Number of vCPUs (1-4) |
| `timeout` | ❌ | Execution timeout in minutes |
| `ports` | ❌ | Exposed ports (comma-separated) |

## Comparison Table

| Feature | Vercel | Cloudflare Pages | Railway | Fly.io | Cloudflare Sandbox | Vercel Sandbox |
|---------|--------|------------------|---------|--------|-------------------|----------------|
| **Status** | ✅ GA | ✅ GA | ✅ GA | ✅ GA | ✅ GA | ✅ GA |
| **Preview URLs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Production Promotion** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Rollback** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Config Mapping** | ✅ vercel.json | ✅ _headers/_redirects | ✅ railway.json | ✅ fly.toml | ✅ wrangler.toml | ✅ vercel.json |
| **Custom Domains** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edge Locations** | Global | Global | Regional | Multi-region | Global | Global |
| **Dynamic Code** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Runtime Support** | Static | Static | Static | Static | Node/Python/Deno | Node22/Python313 |

## Common Patterns

### Preview → Production Workflow

1. **Deploy to Preview:**
   ```bash
   br drop ./dist --site abc --profile vercel --target preview
   ```

2. **Test the preview URL** (shown in CLI output)

3. **Promote to Production:**
   ```bash
   br promote --site abc --to <deployId> --profile vercel
   ```

### Rollback Pattern

```bash
# List releases to find previous deployment
br releases --site abc

# Rollback to specific deployment
br rollback --site abc --to <oldDeployId> --profile vercel
```

### Multi-Environment Setup

Create separate profiles for staging and production:

```bash
# Staging
br profiles add --site abc --name vercel-staging --adapter vercel \
  --token @~/.secrets/vercel-staging.token --projectName my-site-staging

# Production
br profiles add --site abc --name vercel-prod --adapter vercel \
  --token @~/.secrets/vercel-prod.token --projectName my-site-prod
```

### Dynamic Site Deployment

Deploy server-side applications with secure code execution:

```bash
# Cloudflare Sandbox
br profiles add --site abc --name cf-sandbox --adapter cloudflare-sandbox \
  --accountId <cf-account-id> --apiToken @~/.secrets/cf.token \
  --runtime node --buildCommand "npm run build"

br drop ./dist --site abc --profile cf-sandbox

# Vercel Sandbox
br profiles add --site abc --name vercel-sandbox --adapter vercel-sandbox \
  --teamId <vercel-team-id> --projectId <vercel-project-id> \
  --token @~/.secrets/vercel.token --runtime node22 --vcpus 4

br drop ./dist --site abc --profile vercel-sandbox
```

## Troubleshooting

### Vercel: "Project not found"

- Ensure `projectName` matches an existing project, or omit it to auto-create
- Verify API token has `Projects:Write` scope

### Cloudflare Pages: "Unauthorized"

- Check API token has `Cloudflare Pages:Edit` permission
- Verify `accountId` is correct (from dashboard URL)

### Preview URL not appearing

- Ensure adapter supports preview URLs (Vercel, Cloudflare Pages, Netlify, Railway, Fly.io)
- Check API response in logs for error messages

### Sandbox deployment issues

- Verify runtime and build commands are correct
- Check API tokens have appropriate permissions
- Ensure source code is compatible with sandbox environment

---

## Next Steps

- See [README.md](../README.md) for general Brail usage
- Explore environment variables for build and runtime configuration
- Check adapter-specific documentation for advanced features

---

**Adapter Status**: 
- ✅ **Production Ready**: SSH/Rsync, S3, FTP, Vercel, Cloudflare Pages, Netlify, Railway, Fly.io, GitHub Pages, Cloudflare Sandbox, Vercel Sandbox
- 🚀 **Total Adapters**: 11 built-in adapters for all deployment scenarios