# @brailhq/adapter-kit

Official SDK for building custom deployment adapters for [Brail](https://github.com/kagehq/brail).

## Installation

```bash
npm install @brailhq/adapter-kit
```

## What are Adapters?

Adapters are plugins that allow Brail to deploy static sites to any platform or hosting service. Build once, deploy anywhere.

## Quick Start

```typescript
import { defineAdapter } from '@brailhq/adapter-kit';

export default defineAdapter({
  name: 'my-custom-adapter',
  version: '1.0.0',
  
  async deploy(context) {
    const { files, config, logger } = context;
    
    // Your deployment logic here
    logger.info('Deploying to custom platform...');
    
    // Upload files, configure platform, etc.
    for (const file of files) {
      await uploadFile(file.path, file.content);
    }
    
    return {
      success: true,
      url: 'https://your-deployed-site.com',
    };
  },
  
  async rollback(context) {
    // Optional: implement rollback logic
  },
});
```

## Adapter Context

The `context` object provides:

- **`files`**: Array of files to deploy
- **`config`**: User-provided configuration
- **`logger`**: Logging utilities (`info`, `warn`, `error`)
- **`metadata`**: Site and deployment metadata

## Configuration Schema

Define what configuration your adapter needs:

```typescript
export default defineAdapter({
  name: 'my-adapter',
  configSchema: {
    apiKey: { type: 'string', required: true },
    region: { type: 'string', default: 'us-east-1' },
    customDomain: { type: 'string', required: false },
  },
  // ...
});
```

## Built-in Adapters

Brail includes adapters for:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3
- GitHub Pages
- FTP/SFTP
- SSH/Rsync
- Railway
- Fly.io

Study their [source code](https://github.com/kagehq/brail/tree/main/packages/adapters) for examples.

## CLI Scaffolder

Create a new adapter quickly:

```bash
npm create br-adapter my-adapter
```

## License

FSL-1.1-MIT © Treadie, Inc.

