# @brailhq/sdk

> Deploy to anywhere in just a few lines of code.

Official JavaScript/TypeScript SDK for [Brail](https://github.com/kagehq/brail). Deploy static sites and dynamic applications to any platform with a simple, intuitive API.

## Features

- 🚀 **One-line deployments** - Deploy in a single function call
- 🎯 **13+ adapters** - Vercel, Cloudflare, Netlify, Railway, S3, and more
- 🔐 **Built-in auth** - Secure API key authentication
- 📦 **Sandbox support** - Create ephemeral environments for testing
- 💾 **Progress tracking** - Real-time upload progress callbacks
- 🔄 **Promote & rollback** - Instant deployment management
- 🌐 **Custom domains** - Add and manage domains programmatically
- 📝 **TypeScript first** - Fully typed for excellent IDE support

## Installation

```bash
npm install @brailhq/sdk
# or
pnpm add @brailhq/sdk
# or
yarn add @brailhq/sdk
```

## Quick Start

```typescript
import { Brail } from '@brailhq/sdk';

// Initialize the SDK
const brail = new Brail({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.brail.io' // or your self-hosted instance
});

// Deploy a site
const deployment = await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: { 
    token: 'vercel-token',
    projectId: 'my-project'
  }
});

console.log('🚀 Deployed to:', deployment.url);
```

## Getting an API Key

1. Visit your Brail dashboard
2. Navigate to **Settings** → **API Tokens**
3. Click **Create Token**
4. Copy the token and keep it secure

Or via CLI:

```bash
br tokens create --name "My SDK Token"
```

## Usage Guide

### 1. Basic Deployment

Deploy a directory to Brail's built-in hosting:

```typescript
const brail = new Brail({ apiKey: 'your-api-key' });

// Create a site first (one-time)
const site = await brail.createSite('my-awesome-site');

// Deploy
const deployment = await brail.deploy({
  siteId: site.id,
  path: './dist', // your build output
  autoActivate: true
});

console.log('Live at:', deployment.url);
```

### 2. Deploy to External Platforms

#### Deploy to Vercel

```typescript
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: {
    token: process.env.VERCEL_TOKEN,
    projectId: 'my-vercel-project',
    teamId: 'my-team', // optional
  }
});
```

#### Deploy to Cloudflare Pages

```typescript
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'cloudflare-pages',
  config: {
    accountId: process.env.CF_ACCOUNT_ID,
    apiToken: process.env.CF_API_TOKEN,
    projectName: 'my-cf-project'
  }
});
```

#### Deploy to S3

```typescript
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 's3',
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

#### Deploy to Netlify

```typescript
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'netlify',
  config: {
    token: process.env.NETLIFY_TOKEN,
    siteId: 'my-netlify-site'
  }
});
```

### 3. Deploy with Progress Tracking

```typescript
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  onProgress: (progress) => {
    if (progress.stage === 'uploading') {
      const percent = (progress.bytesUploaded! / progress.totalBytes!) * 100;
      console.log(`Uploading: ${percent.toFixed(1)}% (${progress.filesUploaded}/${progress.totalFiles} files)`);
    } else {
      console.log(`Stage: ${progress.stage} - ${progress.message}`);
    }
  }
});
```

### 4. Using Connection Profiles

Save adapter credentials for reuse:

```typescript
// Create a profile (one-time)
const profile = await brail.createProfile(
  'my-site',
  'production-vercel',
  'vercel',
  {
    token: process.env.VERCEL_TOKEN,
    projectId: 'my-project',
    teamId: 'my-team'
  }
);

// Deploy using the profile
await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  profileId: profile.id, // much cleaner!
  target: 'production'
});
```

### 5. Preview & Production Deployments

```typescript
// Deploy to preview environment
const preview = await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  profileId: 'my-profile',
  target: 'preview'
});

console.log('Preview URL:', preview.previewUrl);

// Promote to production
await brail.promote({
  siteId: 'my-site',
  deployId: preview.deployId,
  profileId: 'my-profile',
  comment: 'Looks good, shipping it!'
});
```

### 6. Rollback

```typescript
// List deployments
const deployments = await brail.listDeployments('my-site');
const previousDeploy = deployments[1]; // second most recent

// Rollback
await brail.rollback({
  siteId: 'my-site',
  toDeployId: previousDeploy.id,
  profileId: 'my-profile'
});
```

### 7. Create Sandboxes

Sandboxes are perfect for:

- AI agent code execution
- Rapid prototyping
- Testing before production
- Isolated environments

#### Vercel Sandbox (Node.js/Python)

```typescript
const sandbox = await brail.createSandbox({
  provider: 'vercel-sandbox',
  path: './my-app',
  config: {
    token: process.env.VERCEL_TOKEN,
    runtime: 'node22', // or 'python3.13'
    vcpus: 2,
    startCommand: 'npm start',
    buildCommand: 'npm install' // optional
  }
});

console.log('Sandbox ready at:', sandbox.url);
```

#### Cloudflare Sandbox (Edge Computing)

```typescript
const sandbox = await brail.createSandbox({
  provider: 'cloudflare-sandbox',
  path: './my-worker',
  config: {
    accountId: process.env.CF_ACCOUNT_ID,
    apiToken: process.env.CF_API_TOKEN,
    sandboxBinding: 'MY_SANDBOX',
    startCommand: 'node server.js'
  }
});

console.log('Edge sandbox at:', sandbox.url);
```

### 8. Manage Custom Domains

```typescript
// Add a domain
const domain = await brail.addDomain('my-site', 'example.com');
console.log('Point your DNS CNAME to:', domain.cnameTarget);

// List domains
const domains = await brail.listDomains('my-site');

// Remove a domain
await brail.removeDomain('my-site', domain.id);
```

### 9. Site Management

```typescript
// List all sites
const sites = await brail.listSites();

// Get site details
const site = await brail.getSite('my-site-id');

// Delete a site
await brail.deleteSite('my-site-id');
```

### 10. API Tokens

```typescript
// Create a scoped token
const { tokenPlain } = await brail.createToken({
  name: 'CI/CD Token',
  siteId: 'my-site', // optional: scope to specific site
  scopes: ['deploy:write'],
  expiresAt: new Date('2025-12-31').toISOString() // optional
});

console.log('New token:', tokenPlain);

// List tokens
const tokens = await brail.listTokens();

// Delete a token
await brail.deleteToken(token.id);
```

## Available Adapters

The SDK supports all 13 Brail adapters:

### Platform Adapters

- `vercel` - Deploy to Vercel
- `cloudflare-pages` - Deploy to Cloudflare Pages
- `cloudflare-workers` - Deploy to Cloudflare Workers
- `netlify` - Deploy to Netlify
- `railway` - Deploy to Railway
- `fly` - Deploy to Fly.io
- `render` - Deploy to Render

### Static Hosting

- `s3` - Deploy to AWS S3 or S3-compatible storage
- `github-pages` - Deploy to GitHub Pages
- `ftp` - Deploy via FTP
- `ssh-rsync` - Deploy via SSH/Rsync

### Sandboxes

- `vercel-sandbox` - Vercel Sandbox (Node.js/Python)
- `cloudflare-sandbox` - Cloudflare Sandbox (Edge Workers)

## Advanced Examples

### CI/CD Integration (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build
        run: npm install && npm run build
      
      - name: Deploy to Brail
        run: |
          node deploy.js
        env:
          BRAIL_API_KEY: ${{ secrets.BRAIL_API_KEY }}
          SITE_ID: ${{ secrets.SITE_ID }}
```

```javascript
// deploy.js
import { Brail } from '@brailhq/sdk';

const brail = new Brail({ apiKey: process.env.BRAIL_API_KEY });

await brail.deploy({
  siteId: process.env.SITE_ID,
  path: './dist',
  profileId: 'production-profile',
  comment: `Deploy from CI (${process.env.GITHUB_SHA?.slice(0, 7)})`
});
```

### Multi-Target Deployment

Deploy to multiple platforms simultaneously:

```typescript
const targets = [
  { name: 'Vercel', profileId: 'vercel-profile' },
  { name: 'Cloudflare', profileId: 'cf-profile' },
  { name: 'Netlify', profileId: 'netlify-profile' }
];

const results = await Promise.allSettled(
  targets.map(target => 
    brail.deploy({
      siteId: 'my-site',
      path: './dist',
      profileId: target.profileId
    })
  )
);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`✅ ${targets[i].name}:`, result.value.url);
  } else {
    console.log(`❌ ${targets[i].name}:`, result.reason);
  }
});
```

### Custom Build Pipeline

```typescript
import { execSync } from 'child_process';
import { Brail } from '@brailhq/sdk';

const brail = new Brail({ apiKey: process.env.BRAIL_API_KEY });

// Run custom build
console.log('📦 Building...');
execSync('npm run build', { stdio: 'inherit' });

// Run tests
console.log('🧪 Testing...');
execSync('npm test', { stdio: 'inherit' });

// Deploy
console.log('🚀 Deploying...');
const deployment = await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  profileId: 'production',
  comment: `Build ${Date.now()}`
});

console.log('✅ Live at:', deployment.url);
```

### Programmatic Rollback on Error

```typescript
const brail = new Brail({ apiKey: process.env.BRAIL_API_KEY });

try {
  // Deploy new version
  const deployment = await brail.deploy({
    siteId: 'my-site',
    path: './dist',
    profileId: 'production'
  });

  // Run health checks
  const isHealthy = await runHealthChecks(deployment.url);
  
  if (!isHealthy) {
    throw new Error('Health checks failed');
  }
} catch (error) {
  console.error('Deployment failed, rolling back...');
  
  // Get previous deployment
  const deployments = await brail.listDeployments('my-site');
  const previous = deployments.find(d => d.status === 'active');
  
  if (previous) {
    await brail.rollback({
      siteId: 'my-site',
      toDeployId: previous.id,
      profileId: 'production'
    });
    console.log('✅ Rolled back successfully');
  }
}
```

## API Reference

### `Brail`

Main SDK class.

#### Constructor

```typescript
new Brail(config: BrailConfig)
```

- `config.apiKey` (required) - Your Brail API key
- `config.baseUrl` (optional) - API base URL (defaults to `http://localhost:3000`)

### Methods

#### `deploy(options: DeployOptions): Promise<DeployResult>`

Deploy a site in one command.

**Options:**

- `siteId` (required) - Site ID
- `path` (required) - Local directory or file path
- `adapter` (optional) - Adapter name
- `config` (optional) - Adapter configuration
- `profileId` (optional) - Profile ID (alternative to adapter + config)
- `target` (optional) - Target environment (`preview` | `production`)
- `comment` (optional) - Deployment comment
- `autoActivate` (optional) - Auto-activate after upload (default: `true`)
- `onProgress` (optional) - Progress callback

**Returns:**

- `deployId` - Deployment ID
- `siteId` - Site ID
- `status` - Deployment status
- `url` - Public URL
- `previewUrl` - Preview URL from adapter
- `platformDeploymentId` - Platform-specific ID
- `deploy` - Full deployment object

#### `createSite(name: string): Promise<Site>`

Create a new site.

#### `listSites(): Promise<Site[]>`

List all sites.

#### `getSite(siteId: string): Promise<Site>`

Get site by ID.

#### `deleteSite(siteId: string): Promise<void>`

Delete a site.

#### `listDeployments(siteId: string): Promise<Deploy[]>`

List all deployments for a site.

#### `getDeployment(deployId: string): Promise<Deploy>`

Get deployment details by ID.

#### `promote(options: PromoteOptions): Promise<DeployResult>`

Promote a preview deployment to production.

#### `rollback(options: RollbackOptions): Promise<{success: boolean, deployId: string}>`

Rollback to a previous deployment.

#### `createSandbox(options: CreateSandboxOptions): Promise<SandboxResult>`

Create an ephemeral sandbox environment.

#### `createProfile(siteId, name, adapter, config): Promise<Profile>`

Create a connection profile.

#### `listProfiles(siteId): Promise<Profile[]>`

List connection profiles.

#### `addDomain(siteId, hostname): Promise<Domain>`

Add a custom domain.

#### `listDomains(siteId): Promise<Domain[]>`

List domains for a site.

#### `createToken(options): Promise<{token, tokenPlain}>`

Create an API token.

#### `listTokens(): Promise<Token[]>`

List API tokens.

See the [full API documentation](https://github.com/kagehq/brail/tree/main/packages/sdk) for complete method signatures and options.

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { Brail, DeployOptions, DeployResult, Site } from '@brailhq/sdk';

const brail = new Brail({ apiKey: 'xxx' });

// Type-safe options
const options: DeployOptions = {
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel', // autocomplete for adapter names
  target: 'preview' // 'preview' | 'production'
};

// Type-safe result
const result: DeployResult = await brail.deploy(options);
```

## Error Handling

All methods throw errors that can be caught:

```typescript
try {
  await brail.deploy({
    siteId: 'my-site',
    path: './dist',
    adapter: 'vercel',
    config: { token: 'invalid' }
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Deployment failed:', error.message);
  }
}
```

## Environment Variables

For convenience, you can use environment variables:

```bash
export BRAIL_API_KEY="your-api-key"
export BRAIL_BASE_URL="https://api.brail.io"
```

```typescript
const brail = new Brail({
  apiKey: process.env.BRAIL_API_KEY!,
  baseUrl: process.env.BRAIL_BASE_URL
});
```

## Examples

Check out the [`examples/`](./examples) directory for complete working examples:

- Basic deployment
- CI/CD integration
- Multi-platform deployment
- Sandbox creation
- Custom build pipelines

## License

FSL-1.1-MIT © Treadie, Inc.

## Links

- **GitHub**: [kagehq/brail](https://github.com/kagehq/brail)
- **Documentation**: [Docs](https://github.com/kagehq/brail/tree/main/docs)
- **Discord**: [Join us](https://discord.gg/KqdBcqRk5E)
- **npm**: [@brailhq/sdk](https://www.npmjs.com/package/@brailhq/sdk)
