import type { DeployAdapter } from './types.js';
import { SshRsyncAdapter } from './sshRsync.adapter.js';
import { S3Adapter } from './s3.adapter.js';
import { VercelAdapter } from './vercel.adapter.js';
import { CloudflarePagesAdapter } from './cloudflare-pages.adapter.js';
import { RailwayAdapter } from './railway.adapter.js';
import { FlyAdapter } from './fly.adapter.js';
import { FtpAdapter } from './ftp.adapter.js';
import { GitHubPagesAdapter } from './github-pages.adapter.js';
import { NetlifyAdapter } from './netlify.adapter.js';
import { CloudflareSandboxAdapter } from './cloudflare-sandbox.adapter.js';
import { vercelSandboxAdapter } from './vercel-sandbox.adapter.js';
import { RenderAdapter } from './render.adapter.js';

export * from './types.js';
export { SshRsyncAdapter } from './sshRsync.adapter.js';
export { S3Adapter } from './s3.adapter.js';
export { VercelAdapter } from './vercel.adapter.js';
export { CloudflarePagesAdapter } from './cloudflare-pages.adapter.js';
export { RailwayAdapter } from './railway.adapter.js';
export { FlyAdapter } from './fly.adapter.js';
export { FtpAdapter } from './ftp.adapter.js';
export { GitHubPagesAdapter } from './github-pages.adapter.js';
export { NetlifyAdapter } from './netlify.adapter.js';
export { CloudflareSandboxAdapter } from './cloudflare-sandbox.adapter.js';
export { vercelSandboxAdapter } from './vercel-sandbox.adapter.js';
export { RenderAdapter } from './render.adapter.js';

/**
 * Global adapter registry
 */
class AdapterRegistry {
  private adapters = new Map<string, DeployAdapter>();

  register(adapter: DeployAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(name: string): DeployAdapter | undefined {
    return this.adapters.get(name);
  }

  listAdapters(): DeployAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// Create and populate global registry
export const adapterRegistry = new AdapterRegistry();

// Phase 1 adapters
adapterRegistry.register(new SshRsyncAdapter());
adapterRegistry.register(new S3Adapter());
adapterRegistry.register(new FtpAdapter());

// Phase 2 adapters
adapterRegistry.register(new VercelAdapter());
adapterRegistry.register(new CloudflarePagesAdapter());
adapterRegistry.register(new NetlifyAdapter());

// Phase 3 adapters
adapterRegistry.register(new RailwayAdapter());
adapterRegistry.register(new FlyAdapter());
adapterRegistry.register(new GitHubPagesAdapter());
adapterRegistry.register(new RenderAdapter());

// Phase 4 adapters - Dynamic/Server-side processing
adapterRegistry.register(new CloudflareSandboxAdapter());
adapterRegistry.register(vercelSandboxAdapter);

// Export discovery utilities
export * from './discovery.js';
