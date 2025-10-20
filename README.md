# Brail

> Deploy static sites and dynamic applications anywhere with zero downtime and instant rollbacks.

**Brail** is a modern FileZilla that lets you push your site to your own servers, cloud storage, or platforms like Vercel and Cloudflare Pages. Full control, no vendor lock-in.

## Features

- Deploy to your own servers (SSH/FTP), S3, or platforms (Vercel/Netlify/Railway/Render)
- **Dynamic sites** with Cloudflare Sandbox & Vercel Sandbox (AI-powered, interactive playgrounds)
- Zero downtime deployments with instant rollbacks
- Auto-detect and build Next.js, Astro, Vite, Nuxt, SvelteKit
- Scoped environment variables with encryption
- Custom domains with auto-SSL via Let's Encrypt
- Replace single files without full redeploy
- Drag & drop UI + powerful CLI
- Remote adapter catalog discoverable from CLI and dashboard

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
See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for deploying to Railway with Supabase and DigitalOcean Spaces.

**Status:** ✅ Ready for production deployment
- Database: Supabase (PostgreSQL)
- Storage: DigitalOcean Spaces (S3-compatible)
- Hosting: Railway (Dockerized)
- Email: Resend (magic link authentication)

## Deploy Your Site

### Web Interface (Recommended)

1. Go to <http://localhost:3001> and create a site
2. Drag your build folder into the upload zone
3. Click "Finalize & Deploy"
4. Your site is live at the preview URL

### CLI (Optional)

```bash
# Install CLI globally
cd apps/cli && pnpm build && pnpm link --global

# Deploy your site
br drop ./dist --site <siteId> --yes
```

## Ignore Files with .dropignore

Create a `.dropignore` file to exclude files from deployment:

```text
# .dropignore example
node_modules/
.git/
*.log
.env
```

## Environment Variables

Manage environment variables through the web interface:

1. Go to your site's **Environment** tab
2. Add variables for different scopes:
   - **Build** - Available during build process
   - **Runtime** - Available to your application
   - **Adapter** - Platform-specific variables

**Available scopes:** `build`, `runtime:preview`, `runtime:production`, `adapter:<name>`

## Available Adapters

**Static & Storage (7):**

- **SSH/Rsync** - Deploy to your own servers via SSH
- **FTP** - Upload to any FTP server
- **S3** - AWS S3, MinIO, or S3-compatible storage
- **Vercel** - Deploy to Vercel platform
- **Cloudflare Pages** - Deploy to Cloudflare Pages
- **Netlify** - Deploy to Netlify platform
- **GitHub Pages** - Deploy to GitHub Pages

**Dynamic & Server-side (2):**

- **Cloudflare Sandbox** - Edge computing with global distribution
- **Vercel Sandbox** - Enterprise-grade sandbox with superior observability

**Platforms (3):**

- **Railway** - Deploy to Railway platform
- **Fly.io** - Deploy to Fly.io platform
- **Render** - Deploy to Render static sites or services

## Custom Adapters

Build your own adapter with [`@brailhq/adapter-kit`](https://www.npmjs.com/package/@brailhq/adapter-kit):

```bash
npm create br-adapter
```

## Quick File Updates

Replace or delete individual files without redeploying your entire site through the web interface:

1. Go to your site's **Files** tab
2. Upload new files or delete existing ones
3. Changes are applied instantly without full redeploy

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

FSL-1.1-MIT License. See LICENSE file for details.
