# Brail CLI

Command-line interface for deploying sites with zero downtime and instant rollbacks.

## Installation

```bash
cd apps/cli
pnpm install
pnpm build
pnpm link --global
```

## Quick Start

```bash
# Login
br login

# Deploy a site
br drop ./dist --site my-site --yes

# Check status
br status --site my-site
```

## Getting Started

The CLI stores your credentials in `~/.brail/config.json` after running `br login`.

You can also set defaults:

```bash
br config --site my-site --adapter vercel --target production
```

## Commands

### Authentication

#### `br login`

Login and save authentication token.

```bash
br login
```

---

### Sites Management

#### `br sites create <name>`

Create a new site.

```bash
br sites create my-awesome-site
```

#### `br sites list`

List all sites (alias: `ls`).

```bash
br sites list
br sites ls --json
```

#### `br sites get <siteId>`

Get site details.

```bash
br sites get my-site
br sites get my-site --json
```

#### `br sites rm <siteId>`

Delete a site (alias: `delete`).

```bash
br sites rm my-site
br sites rm my-site --yes  # Skip confirmation
```

---

### Deployment

#### `br drop <dir>`

Deploy a directory.

**Options:**

- `-s, --site <siteId>` - Site ID
- `-y, --yes` - Auto-activate after upload
- `-p, --profile <name>` - Use connection profile
- `-a, --adapter <name>` - Adapter name
- `-t, --target <target>` - Target environment (preview | production)
- `--build [cmd]` - Build before deploy
- `--framework <framework>` - Framework type
- `--output <dir>` - Build output directory
- `--skip-build` - Skip auto-build

**Examples:**

```bash
# Basic deployment
br drop ./dist --site my-site --yes

# Deploy to Vercel
br drop ./dist --site my-site --adapter vercel --yes

# Build and deploy
br drop . --site my-site --build --framework next --yes

# Use a profile
br drop ./dist --site my-site --profile production --yes
```

#### `br promote`

Promote a preview deployment to production.

```bash
br promote --site my-site --to deploy-123 --profile prod --yes
```

#### `br rollback`

Rollback to a previous deployment.

```bash
br rollback --site my-site --to deploy-abc --profile prod
```

#### `br status`

Show deployment status.

```bash
br status --site my-site
br status --site my-site --deploy deploy-123
```

---

### Live Patching

#### `br replace <localFile>`

Replace a single file in the current deployment.

```bash
br replace ./style.css --site my-site --dest /css/style.css --yes
```

#### `br replace-dir <localDir>`

Replace a directory in the current deployment.

```bash
br replace-dir ./images --site my-site --dest /assets/ --yes
br replace-dir ./css --site my-site --dest /css/ --no-delete
```

#### `br delete-paths`

Delete paths from the current deployment.

```bash
br delete-paths --site my-site --paths "/old.html,/deprecated/" --yes
```

#### `br watch`

Watch local directory and auto-patch on changes.

```bash
br watch --site my-site --root ./dist --base / --auto
br watch --site my-site --ignore "*.log,node_modules/**"
```

---

### Profiles Management

#### `br profiles add`

Add a new connection profile.

```bash
# Interactive
br profiles add

# With flags (SSH example)
br profiles add \
  --site my-site \
  --name production \
  --adapter ssh-rsync \
  --host server.com \
  --user deploy \
  --privateKey @~/.ssh/id_rsa \
  --basePath /var/www/site

# Vercel example
br profiles add \
  --site my-site \
  --name vercel-prod \
  --adapter vercel \
  --token @~/vercel-token.txt \
  --projectId prj_xxx
```

#### `br profiles list`

List connection profiles.

```bash
br profiles list --site my-site
```

#### `br profiles get`

Get profile details.

```bash
br profiles get --site my-site --id profile-123
```

#### `br profiles update`

Update a profile.

```bash
br profiles update --site my-site --id profile-123 --name new-name
br profiles update --site my-site --id profile-123 --config '{"token":"new-token"}'
```

#### `br profiles rm`

Delete a profile (alias: `delete`).

```bash
br profiles rm --site my-site --id profile-123
br profiles rm --site my-site --id profile-123 --yes
```

#### `br profiles default`

Set default connection profile.

```bash
br profiles default --site my-site --name production
```

---

### Tokens Management

#### `br tokens create`

Create a new API token.

```bash
# Interactive
br tokens create

# With flags
br tokens create --name "CI Token" --scopes "deploy:write,deploy:read"
br tokens create --name "Site Token" --site my-site --expires 2025-12-31
```

#### `br tokens list`

List all API tokens (alias: `ls`).

```bash
br tokens list
br tokens ls --json
```

#### `br tokens rm <tokenId>`

Delete a token (alias: `delete`).

```bash
br tokens rm token-123
br tokens rm token-123 --yes
```

---

### Sandboxes

#### `br sandbox create <path>`

Create a sandbox environment.

**Vercel Sandbox:**

```bash
br sandbox create ./api \
  --provider vercel-sandbox \
  --token $VERCEL_TOKEN \
  --runtime node22 \
  --vcpus 2 \
  --start-cmd "npm start" \
  --name my-sandbox
```

**Cloudflare Sandbox:**

```bash
br sandbox create ./worker \
  --provider cloudflare-sandbox \
  --account-id $CF_ACCOUNT_ID \
  --api-token $CF_TOKEN \
  --sandbox-binding MY_SANDBOX
```

---

### Templates

#### `br templates list`

List available templates (alias: `ls`).

```bash
br templates list
```

#### `br templates info <templateId>`

Show template details.

```bash
br templates info landing-page
```

#### `br templates use <templateId>`

Deploy from a template.

```bash
# Create new site
br templates use landing-page --name "My Landing Page"

# Deploy to existing site
br templates use landing-page --site my-site --profile production

# With variables
br templates use landing-page \
  --name "Product Launch" \
  --var SITE_TITLE="Amazing Product" \
  --var SITE_DESCRIPTION="Best product ever"
```

---

### Domains

#### `br domain add <hostname>`

Add a custom domain.

```bash
br domain add example.com --site my-site
```

#### `br domain list`

List domains for a site.

```bash
br domain list --site my-site
```

#### `br domain verify <hostname>`

Verify domain DNS configuration.

```bash
br domain verify example.com --site my-site
```

#### `br domain rm <hostname>`

Remove a domain.

```bash
br domain rm example.com --site my-site
```

---

### Environment Vars

#### `br env set`

Set environment variable.

```bash
br env set --site my-site --key API_KEY --value "secret123"
br env set --site my-site --key DB_URL --value @db-url.txt
```

#### `br env get`

Get environment variable.

```bash
br env get --site my-site --key API_KEY
```

#### `br env list`

List environment variables.

```bash
br env list --site my-site
```

#### `br env rm`

Remove environment variable.

```bash
br env rm --site my-site --key OLD_KEY
```

---

### Monitoring & Logs

#### `br logs`

Show deployment logs.

```bash
br logs --site my-site
br logs --site my-site --deploy deploy-123
br logs --site my-site --follow  # Live logs (WebSocket)
br logs --site my-site --limit 100
```

#### `br releases`

List releases for a site.

```bash
br releases --site my-site
```

#### `br audit`

View site audit history.

```bash
br audit --site my-site
br audit --site my-site --from 2025-10-01 --to 2025-10-31
br audit --site my-site --action deploy.activate
br audit --site my-site --json --limit 50
```

#### `br open`

Open deployment URL in browser.

```bash
br open --site my-site
br open --site my-site --deploy deploy-123
```

---

### Utilities

#### `br init`

Initialize `_drop.json` configuration file.

```bash
br init
```

#### `br adapters`

List available deployment adapters.

```bash
br adapters
```

#### `br build [dir]`

Build a project locally.

```bash
br build
br build ./my-app --framework next --output ./dist
br build --cmd "npm run build" --skip-install
```

#### `br config`

Manage CLI configuration defaults.

```bash
# Set defaults
br config --site my-site --adapter vercel --target production

# View config
br config --list

# Unset default
br config --unset site
```

---

## Environment Setup

### Env Variables

- `BRAIL_API_URL` - API base URL (default: `http://localhost:3000`)
- `BRAIL_TOKEN` - Authentication token (alternative to `br login`)

### Config File

Location: `~/.brail/config.json`

```json
{
  "apiUrl": "http://localhost:3000",
  "token": "your-token-here",
  "defaults": {
    "site": "my-site",
    "adapter": "vercel",
    "target": "production"
  }
}
```

## Usage Examples

### Deploy Next.js App

```bash
# Build and deploy
br drop . --site my-nextjs-app --build --framework next --yes

# Or manually
npm run build
br drop ./out --site my-nextjs-app --yes
```

### CI/CD Pipeline

```bash
# Create API token
br tokens create --name "GitHub Actions" --scopes "deploy:write"

# In CI (GitHub Actions)
export BRAIL_TOKEN="${{ secrets.BRAIL_TOKEN }}"
br drop ./dist --site my-site --profile production --yes
```

### Multi-Environment Workflow

```bash
# Deploy to preview
br drop ./dist --site my-site --target preview --profile staging

# Test and promote
br promote --site my-site --to deploy-123 --profile production --yes
```

### Watch Mode Development

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Watch and patch
br watch --site my-site --root ./public --auto
```

## Troubleshooting

### Authentication Issues

```bash
# Clear config and re-login
rm ~/.brail/config.json
br login
```

### Check Deployment Status

```bash
br status --site my-site
br logs --site my-site --limit 50
```

### Verify Profile Configuration

```bash
br profiles list --site my-site
br profiles get --site my-site --id profile-123
```

## License

FSL-1.1-MIT © Treadie, Inc.
