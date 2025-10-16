# Brail

> Deploy static sites anywhere with zero downtime and instant rollbacks.

**Brail** is a modern filezilla that lets you push your site to your own servers, cloud storage, or platforms like Vercel and Cloudflare Pages. Full control, no vendor lock-in.

## Features

- Deploy to your own servers (SSH/FTP), S3, or platforms (Vercel/Netlify/Railway)
- Zero downtime deployments with instant rollbacks
- Auto-detect and build Next.js, Astro, Vite, Nuxt, SvelteKit
- Custom domains with DNS verification
- Auto-SSL via Let's Encrypt (HTTPS made easy)
- Replace single files without full redeploy
- Watch mode for auto-deploy on save
- Drag & drop UI + powerful CLI

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres + MinIO)
docker-compose up -d

# Generate encryption key for secrets
node scripts/generate-key.js
# Add to apps/api/.env: SECRET_KEY_256=<your-key>

# Run database migrations
pnpm db:migrate

# Start everything
pnpm dev
```

Open http://localhost:3001 to use the web interface.

## Deploy Your Site

### Web Interface

1. Go to http://localhost:3001 and create a site
2. Drag your build folder into the upload zone
3. Click "Finalize & Deploy"
4. Your site is live at the preview URL

### CLI

```bash
# Install CLI globally
cd apps/cli && pnpm build && pnpm link --global

# Login
br login

# Deploy your site
br drop ./dist --site <siteId> --yes

# Replace a single file (no full redeploy)
br replace ./app.css --site <siteId> --dest /css/app.css --yes

# Watch for changes and auto-deploy
br watch --site <siteId> --root ./dist --auto
```

## Ignore Files with .dropignore

Create a `.dropignore` file to exclude files and directories from deployment (similar to `.gitignore`):

```
# .dropignore example
node_modules/
.git/
*.log
.env
.DS_Store
src/
*.test.js
```

**Supported patterns:**
- `node_modules/` - Ignore entire directory
- `*.log` - Wildcard patterns
- `.env` - Exact file names
- `# comments` - Lines starting with # are ignored

This works with both drag-and-drop uploads and CLI deployments.

## Build Your Project

Brail automatically detects and builds popular frameworks:

```bash
# Auto-detect framework and build
br build .

# Build and deploy in one command
br drop . --build auto --site <siteId> --yes

# Specify framework explicitly
br drop . --build auto --framework next --site <siteId>

# Custom build command
br drop . --build "pnpm build" --output dist --site <siteId>

# Skip dependency installation (use existing node_modules)
br build . --skip-install
```

**Supported:** Next.js, Astro, Vite, Nuxt, SvelteKit, TanStack Start, React, Vue, static HTML

Brail validates your build output and warns about SSR routes or missing configs. Build logs are captured and downloadable from the Activity tab.

## Custom Domains

```bash
br domain add www.example.com --site <siteId>
br domain verify www.example.com --site <siteId>
```

The Domains tab shows DNS instructions and verification status.

## Deploy to Your Infrastructure

Brail includes adapters for deploying to your own servers and cloud storage:

### SSH/rsync (Any Linux Server)
Deploy to your VPS with atomic symlink switching. Works with nginx, Apache, Caddy, etc.

```bash
br profiles add --site <siteId> --adapter ssh-rsync \
  --host your-server.com --user deploy \
  --privateKey @~/.ssh/id_ed25519 \
  --basePath /var/www/my-site
```

### FTP (Shared Hosting)
Works with traditional hosting providers like Hostgator, Bluehost, etc.

```bash
br profiles add --site <siteId> --adapter ftp \
  --host ftp.example.com --user username \
  --password @~/.secrets/ftp-pass \
  --basePath /public_html
```

### S3 (Cloud Storage)
Deploy to AWS S3, Cloudflare R2, DigitalOcean Spaces, or any S3-compatible storage.

```bash
br profiles add --site <siteId> --adapter s3 \
  --bucket my-bucket --region us-east-1 \
  --accessKeyId AKIA... --secretAccessKey ...
```

## Deploy to Cloud Platforms

### Vercel, Cloudflare Pages, Netlify
Get automatic preview URLs and one-click production promotion.

```bash
# Add profile
br profiles add --site <siteId> --adapter vercel \
  --token @~/.secrets/vercel.token --projectName my-site

# Deploy to preview
br drop ./dist --site <siteId> --profile vercel --target preview

# Promote to production
br promote --site <siteId> --to <deployId> --profile vercel
```

### Railway, Fly.io, GitHub Pages
Deploy to modern cloud platforms with built-in rollback support.

```bash
br profiles add --site <siteId> --adapter railway \
  --token @~/.secrets/railway.token --projectId prj_abc123

br drop ./dist --site <siteId> --profile railway
```

## Custom Adapters

Build your own adapter with [`@brailhq/adapter-kit`](https://www.npmjs.com/package/@brailhq/adapter-kit):

```bash
npm create br-adapter
# Follow the interactive prompts

cd br-adapter-{name}
npm install
npm run dev
```

See [`ADAPTER_SDK.md`](./ADAPTER_SDK.md) for full docs or check out the [npm package](https://www.npmjs.com/package/@brailhq/adapter-kit).

**Built-in adapters:** ssh-rsync, ftp, s3, vercel, cloudflare-pages, netlify, railway, fly, github-pages

## Quick File Updates (No Full Redeploy)

Replace a single file or delete paths without redeploying your entire site:

```bash
# Replace one file
br replace ./logo.png --site <siteId> --dest /images/logo.png --yes

# Replace entire directory
br replace-dir ./images --site <siteId> --dest /images/ --yes

# Delete files
br delete-paths --site <siteId> --paths "/old,/unused.jpg" --yes

# Watch for changes and auto-patch
br watch --site <siteId> --root ./dist --base / --auto
```

**How it works**: Unchanged files reference the original deployment (no duplication). Only changed/deleted files are tracked in the patch. Rollback works on patches too.


## Configuration

### Environment Variables

Create `apps/api/.env`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brail
SECRET_KEY_256=<64-char-hex-from-generate-key-script>
SESSION_SECRET=<random-secret>
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Optional: Custom domains
PUBLIC_HOST=dev.br.local  # CNAME target for custom domains

# Optional: Community adapters
BR_ENABLE_THIRD_PARTY_ADAPTERS=true  # Enable br-adapter-* discovery
BR_ADAPTER_DIRS=/path/to/adapters    # Additional search directories (colon-separated)
```

### Services

- **Web UI**: http://localhost:3001
- **API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (admin/password)
- **Postgres**: localhost:5432

## Documentation

- `br --help` - CLI reference
- `ADAPTER_SDK.md` - Build custom adapters
- `/example-site/` - Example project

## Development

```bash
# Start development servers
pnpm dev

# Run linting
pnpm lint

# Build everything
pnpm build

# Run tests
pnpm test
```

## Contributing

PRs welcome! To add an adapter, run `npm create br-adapter` and publish to npm.

## License

FSL-1.1-MIT License. See LICENSE file for details.
