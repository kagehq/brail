# Brail Adapter SDK (`@br/adapter-kit`)

The **`@br/adapter-kit`** is a public TypeScript SDK for building custom deployment adapters for Brail.

## What's Included

### Core Types

```typescript
import {
  defineAdapter,           // Helper to define an adapter
  type DeployAdapter,      // Main adapter interface
  type AdapterContext,     // Context passed to adapter methods
  type UploadInput,        // Input for upload method
  type ActivateInput,      // Input for activate method
  type RollbackInput,      // Input for rollback method
  type ReleaseInfo,        // Info about a release
} from '@br/adapter-kit';
```

### Helper Functions

```typescript
import { validateRequired } from '@br/adapter-kit';

// Validate that config has required fields
const result = validateRequired(config, [
  { name: 'apiKey', type: 'string' },
  { name: 'projectId', type: 'string' },
  { name: 'region', type: 'string', optional: true },
]);

if (!result.valid) {
  console.error(result.reason);
}
```

---

## Quick Start

### 1. Scaffold a New Adapter

```bash
npx create-br-adapter

# Prompts:
# - Adapter name: railway
# - Display Name: Railway
# - Description: Deploy to Railway
```

This creates:
```
br-adapter-railway/
├── package.json         # With @br/adapter-kit as peerDependency
├── tsconfig.json        # TypeScript config
├── src/
│   └── index.ts         # Your adapter implementation
├── README.md
└── .gitignore
```

### 2. Implement Your Adapter

Edit `src/index.ts`:

```typescript
import { defineAdapter, validateRequired } from '@br/adapter-kit';
import type { AdapterContext, UploadInput, ActivateInput } from '@br/adapter-kit';

export default defineAdapter(() => ({
  name: 'railway',

  validateConfig(config: unknown) {
    return validateRequired(config, [
      { name: 'token', type: 'string' },
      { name: 'projectId', type: 'string' },
    ]);
  },

  async upload(ctx: AdapterContext, input: UploadInput) {
    const { deployId, filesDir, config, site } = input;
    
    ctx.logger.info(`[Railway] Uploading deploy ${deployId}`);
    
    // 1. Read files from filesDir
    // 2. Upload to Railway API
    // 3. Return deployment info
    
    return {
      destinationRef: `railway://${config.projectId}/${deployId}`,
      platformDeploymentId: deployId,
      previewUrl: `https://${site.name}.up.railway.app`,
    };
  },

  async activate(ctx: AdapterContext, input: ActivateInput) {
    const { deployId, config, target } = input;
    
    ctx.logger.info(`[Railway] Activating deploy ${deployId} to ${target}`);
    
    // Mark deployment as active in Railway
    // Update routing if needed
  },

  async rollback(ctx: AdapterContext, input: RollbackInput) {
    const { toDeployId, config } = input;
    
    ctx.logger.info(`[Railway] Rolling back to ${toDeployId}`);
    
    // Switch active deployment
  },

  async listReleases(ctx: AdapterContext, config: unknown) {
    // Optional: List all releases from Railway
    return [
      {
        deployId: 'deploy-123',
        active: true,
        createdAt: '2025-10-16T10:00:00Z',
      },
    ];
  },
}));
```

### 3. Build & Test

```bash
# Install dependencies
npm install

# Build
npm run build

# Link locally for testing
npm link

# In your Brail project
npm link br-adapter-railway

# Enable third-party adapters
echo "BR_ENABLE_THIRD_PARTY_ADAPTERS=true" >> apps/api/.env

# Restart API
pnpm dev

# Test deployment
br profile add myprofile --adapter railway --token TOKEN --projectId PROJECT_ID
br drop ./dist --site SITE_ID --profile myprofile
```

### 4. Publish to npm

```bash
# Build for production
npm run build

# Publish to npm (must be named br-adapter-*)
npm publish
```

---

## 🔌 Adapter Interface

### Required Methods

#### `name: string`
Unique identifier for your adapter (e.g., 'railway', 's3', 'vercel')

#### `validateConfig(config: unknown)`
Validate adapter configuration before deployment.

**Returns**:
- `{ valid: true }` if config is valid
- `{ valid: false, reason: string }` if invalid

```typescript
validateConfig(config: unknown) {
  if (!config || typeof config !== 'object') {
    return { valid: false, reason: 'Config must be an object' };
  }
  
  const c = config as any;
  if (!c.token) {
    return { valid: false, reason: 'Missing required field: token' };
  }
  
  return { valid: true };
}
```

#### `upload(ctx, input)`
Upload files to your platform.

**Input**:
```typescript
{
  deployId: string;      // Unique deploy ID
  filesDir: string;      // Path to files directory
  config: unknown;       // User's adapter config
  site: {
    id: string;
    name: string;
  };
}
```

**Returns**:
```typescript
{
  destinationRef?: string;        // Reference to deployed files
  platformDeploymentId?: string;  // Platform-specific deploy ID
  previewUrl?: string;            // Preview URL if available
}
```

#### `activate(ctx, input)`
Activate a deployment (make it live).

**Input**:
```typescript
{
  deployId: string;
  config: unknown;
  site: { id: string; name: string };
  target?: 'preview' | 'production';  // Defaults to 'preview'
}
```

### Optional Methods

#### `rollback(ctx, input)`
Rollback to a previous deployment.

**Input**:
```typescript
{
  toDeployId: string;  // Deploy ID to rollback to
  config: unknown;
  site: { id: string; name: string };
}
```

#### `listReleases(ctx, config)`
List all releases/deployments from your platform.

**Returns**:
```typescript
Array<{
  deployId: string;
  active: boolean;
  createdAt?: string;
}>
```

---

## 🛠️ Helper Utilities

### `validateRequired(config, fields)`

Validate that config object has required fields:

```typescript
import { validateRequired } from '@br/adapter-kit';

const result = validateRequired(config, [
  { name: 'apiKey', type: 'string' },
  { name: 'port', type: 'number', optional: true },
  { name: 'enabled', type: 'boolean' },
]);

if (!result.valid) {
  console.error(result.reason);
  // "Missing required field: apiKey"
  // "Field 'port' must be of type number"
}
```

**Supported Types**:
- `'string'`
- `'number'`
- `'boolean'`
- `'object'`
- `'array'`

---

## Context & Logging

Every adapter method receives a `context` object:

```typescript
ctx.logger.info('Deployment started');
ctx.logger.debug('Uploading file: index.html');
ctx.logger.error('Upload failed:', error);
```

**Context Properties**:
- `logger` - Logger instance (info, debug, error methods)
- `tmpDir` - Temporary directory for scratch work (optional)

---

## Real-World Examples

### S3-Compatible Storage

```typescript
export default defineAdapter(() => ({
  name: 's3-custom',
  
  async upload(ctx, input) {
    const s3 = new S3Client(input.config);
    
    // Upload all files
    const files = await readdir(input.filesDir, { recursive: true });
    for (const file of files) {
      await s3.upload({
        Bucket: input.config.bucket,
        Key: file.path,
        Body: await readFile(file.fullPath),
      });
    }
    
    return {
      destinationRef: `s3://${input.config.bucket}/${input.deployId}`,
      previewUrl: `https://${input.config.bucket}.s3.amazonaws.com`,
    };
  },
  
  async activate(ctx, input) {
    // Update bucket website configuration to point to new deploy
  },
}));
```

### Platform API (Vercel-style)

```typescript
export default defineAdapter(() => ({
  name: 'platform',
  
  async upload(ctx, input) {
    // Create deployment via API
    const response = await fetch('https://api.platform.com/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${input.config.token}`,
      },
      body: JSON.stringify({
        name: input.site.name,
        files: await collectFiles(input.filesDir),
      }),
    });
    
    const deployment = await response.json();
    
    return {
      platformDeploymentId: deployment.id,
      previewUrl: deployment.url,
    };
  },
  
  async activate(ctx, input) {
    // Promote to production
    await fetch(`https://api.platform.com/deployments/${input.deployId}/promote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${input.config.token}`,
      },
    });
  },
}));
```

---

## Security Best Practices

1. **Never log sensitive data**:
   ```typescript
   // ❌ BAD
   ctx.logger.info('Config:', config);
   
   // ✅ GOOD
   ctx.logger.info('Uploading to platform');
   ```

2. **Validate all inputs**:
   ```typescript
   validateConfig(config: unknown) {
     const result = validateRequired(config, [
       { name: 'token', type: 'string' },
     ]);
     
     if (!result.valid) return result;
     
     // Additional validation
     if (config.token.length < 32) {
       return { valid: false, reason: 'Token must be at least 32 characters' };
     }
     
     return { valid: true };
   }
   ```

3. **Handle errors gracefully**:
   ```typescript
   async upload(ctx, input) {
     try {
       await uploadFiles();
     } catch (error) {
       ctx.logger.error('Upload failed:', error.message);
       throw new Error(`Failed to upload: ${error.message}`);
     }
   }
   ```

---

## Publishing Checklist

Before publishing your adapter:

- [ ] Package name starts with `br-adapter-` (e.g., `br-adapter-railway`)
- [ ] `@br/adapter-kit` is listed as `peerDependency`
- [ ] TypeScript declarations are built (`npm run build`)
- [ ] README includes:
  - [ ] Installation instructions
  - [ ] Configuration example
  - [ ] Required config fields
  - [ ] Usage example
- [ ] Adapter implements at minimum: `name`, `validateConfig`, `upload`, `activate`
- [ ] Config validation is thorough
- [ ] Error messages are helpful
- [ ] No sensitive data in logs

---

## Testing Your Adapter

### Local Testing

1. **Build and link**:
   ```bash
   npm run build
   npm link
   ```

2. **Link in Brail**:
   ```bash
   cd /path/to/brail
   npm link br-adapter-yourname
   ```

3. **Enable third-party adapters**:
   ```bash
   # In apps/api/.env
   BR_ENABLE_THIRD_PARTY_ADAPTERS=true
   ```

4. **Restart Brail API**:
   ```bash
   pnpm dev
   ```

5. **Check adapter is loaded**:
   ```bash
   br adapters ls
   # Should show your adapter in the list
   ```

6. **Test deployment**:
   ```bash
   br profile add test --adapter yourname --token TEST
   br drop ./dist --site SITE_ID --profile test
   ```

---

## Contributing

Have questions or found a bug in the SDK?

- **Issues**: https://github.com/kagehq/brail/issues
- **Discussions**: https://github.com/kagehq/brail/discussions

Want to add helper utilities to the SDK? Submit a PR!

---

## 📚 Additional Resources

- **Example Adapters**: See `packages/adapters/src/` for built-in adapters
- **CLI Commands**: Run `br adapters ls` to list all available adapters
- **API Docs**: See `apps/api/src/adapters/` for adapter registry implementation
- **Type Definitions**: See `packages/adapter-kit/src/index.ts` for all types

---

**Happy adapter building!** 🚀

