# @brailhq/adapter-kit

Official SDK for building custom deployment adapters for [Brail](https://github.com/kagehq/brail).

## Installation

```bash
npm install @brailhq/adapter-kit
```

## What are Adapters?

Adapters are plugins that allow Brail to deploy sites to any platform or hosting service. Build once, deploy anywhere.

## Quick Start

```typescript
import { defineAdapter, validateRequired } from '@brailhq/adapter-kit';
import type { AdapterContext, UploadInput, ActivateInput } from '@brailhq/adapter-kit';

export default defineAdapter(() => ({
  name: 'my-custom-adapter',
  
  validateConfig(config: unknown) {
    return validateRequired(config, [
      { name: 'apiKey', type: 'string' },
      { name: 'projectId', type: 'string' },
    ]);
  },
  
  async upload(ctx: AdapterContext, input: UploadInput) {
    const { deployId, filesDir, config, site } = input;
    
    ctx.logger.info('Uploading files to platform...');
    
    // Upload files from filesDir to your platform
    // Return deployment info
    
    return {
      destinationRef: `platform://${config.projectId}/${deployId}`,
      platformDeploymentId: deployId,
      previewUrl: `https://${site.name}.platform.com`,
    };
  },
  
  async activate(ctx: AdapterContext, input: ActivateInput) {
    const { deployId, config, target } = input;
    
    ctx.logger.info(`Activating deployment to ${target}`);
    
    // Activate the deployment (make it live)
  },
  
  async rollback(ctx: AdapterContext, input: RollbackInput) {
    const { toDeployId, config } = input;
    
    ctx.logger.info(`Rolling back to ${toDeployId}`);
    
    // Switch to previous deployment
  },
}));
```

## Core Types

```typescript
import {
  defineAdapter,           // Helper to define an adapter
  type DeployAdapter,      // Main adapter interface
  type AdapterContext,     // Context passed to adapter methods
  type UploadInput,        // Input for upload method
  type ActivateInput,      // Input for activate method
  type RollbackInput,      // Input for rollback method
  type UploadResult,       // Result from upload
  type ValidationResponse, // Config validation result
} from '@brailhq/adapter-kit';
```

## Helper Functions

```typescript
import { 
  validateRequired,  // Validate required config fields
  createLogger,      // Create prefixed logger
  sleep,            // Promise-based sleep
  retry,            // Retry with exponential backoff
} from '@brailhq/adapter-kit';
```

## Adapter Interface

### Required Methods

#### `name: string`
Unique identifier for your adapter (e.g., 'my-platform', 's3', 'vercel')

#### `validateConfig(config: unknown): ValidationResponse`
Validate adapter configuration before deployment.

Returns:
- `{ valid: true }` if config is valid
- `{ valid: false, reason: string }` if invalid

#### `upload(ctx: AdapterContext, input: UploadInput): Promise<UploadResult>`
Upload files to your platform.

Input:
- `deployId` - Unique deploy ID
- `filesDir` - Path to files directory
- `config` - User's adapter config
- `site` - Site metadata

Returns:
- `destinationRef` - Reference to deployed files (optional)
- `platformDeploymentId` - Platform-specific deploy ID (optional)
- `previewUrl` - Preview URL if available (optional)

#### `activate(ctx: AdapterContext, input: ActivateInput): Promise<void>`
Activate a deployment (make it live).

Input:
- `deployId` - Deploy ID to activate
- `config` - User's adapter config
- `site` - Site metadata
- `target` - 'preview' or 'production'

### Optional Methods

#### `rollback(ctx: AdapterContext, input: RollbackInput): Promise<void>`
Rollback to a previous deployment.

#### `listReleases(ctx: AdapterContext, config: unknown): Promise<ReleaseInfo[]>`
List all releases/deployments from your platform.

#### `cleanupOld(ctx: AdapterContext, config: unknown, keep: number): Promise<void>`
Clean up old releases, keeping only the most recent ones.

## Utilities

### `validateRequired(config, fields)`

Validate required configuration fields:

```typescript
const result = validateRequired(config, [
  { name: 'apiKey', type: 'string' },
  { name: 'port', type: 'number' },
]);

if (!result.valid) {
  console.error(result.reason);
}
```

### `createLogger(name, baseLogger?)`

Create a logger with automatic prefixing:

```typescript
const logger = createLogger('my-adapter');
logger.info('Starting upload'); // Logs: "[my-adapter] Starting upload"
```

### `sleep(ms)`

Promise-based sleep:

```typescript
await sleep(1000); // Wait 1 second
```

### `retry(fn, options)`

Retry with exponential backoff:

```typescript
const result = await retry(
  async () => await apiCall(),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 2,
  }
);
```

## CLI Scaffolder

Create a new adapter quickly:

```bash
npm create br-adapter
# or
npx create-br-adapter
```

This creates a complete adapter project with TypeScript setup, examples, and documentation.

## Built-in Adapters

Study Brail's [built-in adapters](https://github.com/kagehq/brail/tree/main/packages/adapters/src) for examples:
- SSH/Rsync
- S3
- FTP
- Vercel
- Cloudflare Pages
- Netlify
- Railway
- Fly.io
- Render
- GitHub Pages
- Cloudflare Workers
- Cloudflare Sandbox
- Vercel Sandbox

## Complete Documentation

See [`docs/ADAPTER_SDK.md`](../../docs/ADAPTER_SDK.md) for the complete adapter development guide.

## License

FSL-1.1-MIT © Treadie, Inc.
