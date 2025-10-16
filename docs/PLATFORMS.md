# Brail Platform Connectors

This guide covers deploying to cloud platforms and services via Brail's adapters: **FTP**, **Vercel**, **Cloudflare Pages**, **Netlify**, **Railway** (beta), **Fly.io** (beta), and **GitHub Pages**.

## Overview

Brail's adapter system supports deploying to various platforms from traditional shared hosting to modern serverless platforms. These adapters handle:

- **Preview deployments**: Automatic preview URLs for testing (where supported)
- **Production promotion**: One-click promotion from preview to production
- **Rollback support**: Instant rollback to previous deployments
- **Config mapping**: Automatic translation of `_drop.json` to platform-specific configs
- **Traditional protocols**: FTP/FTPS support for shared hosting environments

## FTP Adapter

Deploy to traditional shared hosting environments via FTP or FTPS (secure FTP).

### Prerequisites

1. **FTP credentials**: Host, username, and password from your hosting provider
2. **FTP access enabled**: Some hosts require enabling FTP in the control panel

### Configuration

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

### Usage

**Deploy:**

```bash
br deploy --site my-site --profile shared-hosting
```

**Rollback:**

```bash
br rollback --site my-site --profile shared-hosting
```

### Notes

- FTP uploads can be slower than SSH/rsync for large files
- FTPS provides encryption in transit (recommended for production)
- Some shared hosts limit concurrent connections
- Atomic deployments use symlink switching (if supported by host)

---

## Vercel Adapter

Deploy static sites and frameworks to Vercel with automatic preview URLs and production promotion.

### Prerequisites

1. **Vercel API Token**: Create at [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Scopes needed: Deployments (Read & Write), Projects (Read & Write)

2. **Team ID** (optional): Find in your Vercel dashboard URL (`vercel.com/teams/[TEAM_ID]`)

### Configuration

```bash
# Add Vercel profile
br profiles add \
  --site <siteId> \
  --name vercel-prod \
  --adapter vercel \
  --token @~/.secrets/vercel.token \
  --projectName my-site
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | Vercel API token |
| `teamId` | ❌ | Team ID (for team deployments) |
| `projectId` | ❌ | Existing project ID (auto-created if omitted) |
| `projectName` | ❌ | Project name (defaults to site name) |
| `framework` | ❌ | Framework hint: `static`, `nextjs`, `other` (default: `static`) |
| `productionDomain` | ❌ | Custom production domain |

### Usage

**Deploy to Preview:**
```bash
br drop ./dist --site abc123 --profile vercel-prod --target preview
```

**Deploy to Production:**
```bash
br drop ./dist --site abc123 --profile vercel-prod --target production
```

**Promote Preview to Production:**
```bash
br promote --site abc123 --to <deployId> --profile vercel-prod
```

### Config Mapping

Brail automatically converts `_drop.json` to `vercel.json`:

**_drop.json:**
```json
{
  "redirects": [
    { "source": "/old", "destination": "/new", "statusCode": 301 }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**Generated vercel.json:**
```json
{
  "redirects": [
    { "source": "/old", "destination": "/new", "permanent": true, "statusCode": 301 }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Rollback

```bash
br rollback --site abc123 --to <oldDeployId> --profile vercel-prod
```

Vercel rollback promotes the specified deployment to production instantly.

---

## Cloudflare Pages Adapter

Deploy static sites to Cloudflare Pages with edge performance and automatic previews.

### Prerequisites

1. **Account ID**: Find in Cloudflare dashboard URL (`dash.cloudflare.com/<ACCOUNT_ID>`)

2. **API Token**: Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Template: **Edit Cloudflare Pages**
   - Permissions: `Cloudflare Pages:Edit`

### Configuration

```bash
# Add Cloudflare Pages profile
br profiles add \
  --site <siteId> \
  --name pages-prod \
  --adapter cloudflare-pages \
  --accountId <accountId> \
  --apiToken @~/.secrets/cf.token \
  --projectName my-site
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `accountId` | ✅ | Cloudflare account ID |
| `apiToken` | ✅ | Cloudflare API token with Pages:Edit permission |
| `projectName` | ❌ | Project name (defaults to site name) |
| `productionDomain` | ❌ | Custom domain (e.g., `mysite.pages.dev`) |

### Usage

**Deploy to Preview:**
```bash
br drop ./dist --site abc123 --profile pages-prod --target preview
```

**Promote to Production:**
```bash
br promote --site abc123 --to <deployId> --profile pages-prod
```

### Config Mapping

Brail converts `_drop.json` to Cloudflare Pages `_redirects` and `_headers` files:

**_drop.json:**
```json
{
  "redirects": [
    { "source": "/old", "destination": "/new", "statusCode": 301 }
  ],
  "headers": [
    {
      "source": "/*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

**Generated _redirects:**
```
/old /new 301
```

**Generated _headers:**
```
/*
  Cache-Control: public, max-age=3600
```

### Rollback

```bash
br rollback --site abc123 --to <oldDeployId> --profile pages-prod
```

---

## Netlify Adapter

Deploy to Netlify with automatic preview deployments and production promotion.

### Prerequisites

1. **Netlify Personal Access Token**: Create at [app.netlify.com/user/applications](https://app.netlify.com/user/applications)
   - Click "New access token" and copy the token

2. **Site ID** (optional): Find in your Netlify site settings under "Site information" → "API ID"

### Configuration

```bash
# Add Netlify profile (existing site)
br profiles add \
  --site <siteId> \
  --name netlify-prod \
  --adapter netlify \
  --token @~/.secrets/netlify.token \
  --siteId xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Or create new site
br profiles add \
  --site <siteId> \
  --name netlify-new \
  --adapter netlify \
  --token @~/.secrets/netlify.token \
  --siteName my-awesome-site
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | Netlify Personal Access Token |
| `siteId` | ❌ | Existing site ID (auto-creates if omitted) |
| `siteName` | ❌ | Site name for new sites (e.g., `my-site` → `my-site.netlify.app`) |

### Usage

**Deploy to Preview:**
```bash
br drop ./dist --site abc123 --profile netlify-prod --target preview
```

**Promote to Production:**
```bash
br promote --site abc123 --to <deployId> --profile netlify-prod
```

**Rollback:**
```bash
br rollback --site abc123 --to <oldDeployId> --profile netlify-prod
```

### Notes

- If no `siteId` is provided, Brail creates a new site automatically
- Preview deployments get unique URLs like `https://deploy-preview-123--my-site.netlify.app`
- Custom domains configured in Netlify dashboard are preserved
- `_redirects` and `_headers` files are automatically handled by Netlify

---

## GitHub Pages Adapter

Deploy to GitHub Pages by pushing to a repository branch (typically `gh-pages`).

### Prerequisites

1. **GitHub Personal Access Token**: Create at [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Select scope: `repo` (Full control of private repositories)
   - Copy the token

2. **GitHub Repository**: Must exist and be accessible with the token
   - Enable GitHub Pages in repo settings: Settings → Pages

### Configuration

```bash
# Add GitHub Pages profile
br profiles add \
  --site <siteId> \
  --name gh-pages-prod \
  --adapter github-pages \
  --token @~/.secrets/github.token \
  --owner myusername \
  --repo my-site \
  --branch gh-pages
```

**Config Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | GitHub Personal Access Token with `repo` scope |
| `owner` | ✅ | Repository owner (username or org) |
| `repo` | ✅ | Repository name |
| `branch` | ❌ | Target branch (default: `gh-pages`) |

### Usage

**Deploy:**

```bash
br drop ./dist --site abc123 --profile gh-pages-prod
```

**Rollback:**

```bash
br rollback --site abc123 --to <oldDeployId> --profile gh-pages-prod
```

### Notes

- Deployment creates a commit on the target branch with your files
- GitHub Pages may take 1-2 minutes to build and publish after push
- Custom domains configured via CNAME file are preserved
- If the branch doesn't exist, Brail creates it automatically
- The adapter uses force-push to ensure clean deploys (no merge conflicts)
- Previous commits are preserved in git history for rollback support

---

## Railway Adapter (Beta)

⚠️ **Status: Beta / Stub**

Railway support is planned for Phase 3. The adapter is currently scaffolded but not functional.

**Planned Features:**
- Deploy static sites via Railway services
- Use Railway volumes or S3-compatible storage for assets
- Automatic nginx/caddy container setup
- Environment-based deployments

**Feedback Welcome**: If you need Railway support, please open an issue describing your use case.

---

## Fly.io Adapter (Beta)

⚠️ **Status: Beta / Stub**

Fly.io support is planned for Phase 3. The adapter is currently scaffolded but not functional.

**Planned Features:**
- Containerized static site deployment
- Automatic Dockerfile generation (nginx/caddy)
- Fly Machines API integration
- Multi-region deployment support

**Feedback Welcome**: If you need Fly.io support, please open an issue.

---

## Comparison Table

| Feature | Vercel | Cloudflare Pages | Railway | Fly.io |
|---------|--------|------------------|---------|--------|
| **Status** | ✅ GA | ✅ GA | ⚠️ Beta | ⚠️ Beta |
| **Preview URLs** | ✅ | ✅ | 🚧 | 🚧 |
| **Production Promotion** | ✅ | ✅ | 🚧 | 🚧 |
| **Rollback** | ✅ | ✅ | 🚧 | 🚧 |
| **Config Mapping** | ✅ vercel.json | ✅ _headers/_redirects | 🚧 | 🚧 |
| **Custom Domains** | ✅ | ✅ | 🚧 | 🚧 |
| **Edge Locations** | Global | Global | Regional | Multi-region |

---

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

---

## Troubleshooting

### Vercel: "Project not found"

- Ensure `projectName` matches an existing project, or omit it to auto-create
- Verify API token has `Projects:Write` scope

### Cloudflare Pages: "Unauthorized"

- Check API token has `Cloudflare Pages:Edit` permission
- Verify `accountId` is correct (from dashboard URL)

### Preview URL not appearing

- Ensure adapter is `vercel` or `cloudflare-pages` (other adapters may not support preview URLs yet)
- Check API response in logs for error messages

---

## Next Steps

- See [README.md](../README.md) for general Brail usage
- Explore [Phase 1 adapters](../README.md#phase-1-adapter-based-releases) for SSH and S3 deployments
- Check [_drop.json specification](../README.md#_dropjson-specification) for config options

---

**Adapter Status**: 
- ✅ **Production Ready**: FTP, Vercel, Cloudflare Pages, Netlify, GitHub Pages, SSH+rsync, S3
- 🚧 **Beta**: Railway, Fly.io (coming in Phase 3)

