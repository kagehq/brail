# Brail

> Modern deployment platform with zero downtime and instant rollbacks. Deploy anywhere, no vendor lock-in.

**Brail** is like FileZilla for the modern web - push your sites to your own servers, cloud storage, or platforms like Vercel and Cloudflare. Full control, maximum flexibility.

## Features

- **13 Deployment Adapters** - SSH, FTP, S3, Vercel, Cloudflare, Railway, Fly.io, Render, Netlify, GitHub Pages, and more
- **Zero Downtime** - Atomic deployments with instant rollbacks
- **Live Patching** - Update individual files without full redeployment
- **Programmatic SDK** - Deploy in 3 lines of JavaScript/TypeScript
- **Templates** - Pre-built sites ready to deploy (landing pages, portfolios)
- **Visual Adapter Builder** - Create custom adapters in your browser
- **Sandboxes** - Cloudflare & Vercel sandboxes for dynamic apps
- **Auto-Build** - Detect and build Next.js, Astro, Vite, Nuxt, SvelteKit
- **Custom Domains** - Auto-SSL via Let's Encrypt
- **Three Interfaces** - Web dashboard, CLI, and SDK

## Community & Support

Join our Discord community for discussions, support, and updates:

[![Discord](https://img.shields.io/badge/Discord-Join%20our%20community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/KqdBcqRk5E)

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres + MinIO)
docker compose up -d

# Generate encryption key for secrets
node scripts/generate-key.js
# Add to apps/api/.env: SECRET_KEY_256=<your-key>

# Run database migrations
pnpm db:migrate

# Start everything
pnpm dev
```

Open <http://localhost:3001> to use the web interface.

### Production Deployment

- Database: Supabase (PostgreSQL)
- Storage: DigitalOcean Spaces (S3-compatible)
- Hosting: Railway (Dockerized)
- Email: Resend (magic link authentication)

## Installation

Brail is available as npm packages:

```bash
# CLI - Deploy from command line
npm install -g @brailhq/cli

# SDK - Programmatic deployments
npm install @brailhq/sdk

# Adapter Kit - Build custom adapters
npm install @brailhq/adapter-kit

# Scaffolder - Create new adapters
npx create-br-adapter my-adapter
```

## Deploy Your Site

### 1. Web Interface (Easiest)

1. Open <http://localhost:3001>
2. Create a site
3. Drag & drop your build folder
4. Deploy! ✨

### 2. CLI

```bash
# Install
npm install -g @brailhq/cli

# Deploy
brail drop ./dist --site my-site --yes
```

### 3. SDK (Programmatic)

```typescript
import { Brail } from '@brailhq/sdk';

const brail = new Brail({ apiKey: 'your-api-key' });

// Deploy a site
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: { token: 'xxx' }
});

// Or spin up a sandbox
const sandbox = await brail.createSandbox({
  provider: 'vercel-sandbox',
  path: './my-app',
  config: {
    token: 'vercel-token',
    runtime: 'node22'
  }
});
console.log('Sandbox URL:', sandbox.url);
```

→ See [`packages/sdk/README.md`](./packages/sdk/README.md) for full docs

## Templates

Deploy pre-built sites in seconds:

```bash
# CLI
br templates use landing-page --name "My Site"

# SDK
await brail.deployTemplate({
  template: 'landing-page',
  siteName: 'my-site'
});
```

**Available:** Landing Page, Portfolio, Coming Soon

→ Web: <http://localhost:3001/templates> | Docs: [`templates/README.md`](./templates/README.md)

## Configuration

### Ignore Files

Create `.dropignore` to exclude files:

```text
node_modules/
.git/
*.log
```

### Environment Variables

Add via web interface (**Environment** tab) or CLI:

```bash
br env add --site my-site --key API_KEY --value secret
```

## Available Adapters (13)

**Traditional & Self-Hosted:**

- SSH/Rsync (zero-downtime, health checks)
- FTP/FTPS

**Storage & CDN:**

- S3 (AWS, MinIO, DigitalOcean Spaces)

**Managed Platforms:**

- Vercel
- Cloudflare Pages
- Netlify
- Railway
- Fly.io
- Render
- GitHub Pages

**Serverless & Edge:**

- Cloudflare Workers
- Vercel Sandbox (Node.js, Python)
- Cloudflare Sandbox (edge computing)

## Build Your Own Adapter

**Visual Builder (No Code):** <http://localhost:3001/adapter-builder>

**CLI:**

```bash
npm create br-adapter
```

→ See [`docs/ADAPTER_SDK.md`](./docs/ADAPTER_SDK.md) for guide

## Live Patching

Update files instantly without redeployment:

```bash
br replace ./app.css --site my-site --dest /css/app.css --yes
br watch --site my-site --root ./dist --auto
```

Or use the **Files** tab in the web interface.

## Development Tools

### FlowScope Integration (Optional)

Debug API traffic with [FlowScope](https://github.com/kagehq/flowscope) - a visual HTTP request/response viewer:

```bash
# 1. Install FlowScope (one-time)
git clone https://github.com/kagehq/flowscope.git
cd flowscope && docker-compose up -d

# 2. Enable in Brail
echo "FLOWSCOPE_ENABLED=true" > apps/web/.env

# 3. View requests at http://localhost:4320
```

## Documentation

- **Quick Start:** You're reading it!
- **Complete API & CLI Reference:** [DETAILED.md](./DETAILED.md)
- **SDK Guide:** [packages/sdk/README.md](./packages/sdk/README.md)
- **Adapter Development:** [docs/ADAPTER_SDK.md](./docs/ADAPTER_SDK.md)
- **Templates:** [templates/README.md](./templates/README.md)

## Contributing

We welcome contributions! Fork, create a feature branch, and submit a PR.

## License

FSL-1.1-MIT - See [LICENSE](./LICENSE) for details.
