import { Injectable, Logger } from '@nestjs/common';

export interface AdapterCatalogEntry {
  name: string;
  title: string;
  category: 'traditional' | 'storage' | 'platform' | 'dynamic';
  description: string;
  features: string[];
  docsUrl?: string;
  supportsPreview: boolean;
  supportsProduction: boolean;
}

@Injectable()
export class AdapterCatalogService {
  private readonly logger = new Logger(AdapterCatalogService.name);
  private cache: AdapterCatalogEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  private readonly fallbackCatalog: AdapterCatalogEntry[] = [
    {
      name: 'ssh-rsync',
      title: 'SSH + rsync',
      category: 'traditional',
      description: 'Deploy to your own servers via SSH with zero-downtime directory swapping.',
      features: ['Atomic deploys', 'Configurable health checks', 'Keep previous releases'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#ssh/rsync-adapter',
      supportsPreview: false,
      supportsProduction: true,
    },
    {
      name: 'ftp',
      title: 'FTP / FTPS',
      category: 'traditional',
      description: 'Upload static assets to shared hosting environments using FTP or FTPS.',
      features: ['Directory syncing', 'Release retention'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#ftp-adapter',
      supportsPreview: false,
      supportsProduction: true,
    },
    {
      name: 's3',
      title: 'Amazon S3 & Compatible',
      category: 'storage',
      description: 'Push static builds to S3, MinIO, or any S3-compatible object storage.',
      features: ['Release pointers', 'Immutable artifacts'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#s3-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'vercel',
      title: 'Vercel',
      category: 'platform',
      description: 'Deploy to Vercel with automatic preview URLs and production promotion.',
      features: ['Preview deployments', 'Production promotion', 'Instant rollbacks'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#vercel-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'cloudflare-pages',
      title: 'Cloudflare Pages',
      category: 'platform',
      description: 'Deploy static sites globally on Cloudflare Pages with automatic CDN caching.',
      features: ['Global CDN', 'Preview deploys', 'Custom domains'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#cloudflare-pages-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'netlify',
      title: 'Netlify',
      category: 'platform',
      description: 'Ship Jamstack applications to Netlify with instant rollbacks.',
      features: ['Preview deploys', 'Build command support'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#netlify-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'railway',
      title: 'Railway',
      category: 'platform',
      description: 'Trigger deployments to Railway using their GraphQL API.',
      features: ['Service automation', 'Deployment history'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#railway-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'fly',
      title: 'Fly.io',
      category: 'platform',
      description: 'Deploy Dockerized apps close to your users with Fly.io.',
      features: ['Global edge regions', 'Docker support'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#flyio-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'render',
      title: 'Render',
      category: 'platform',
      description: 'Ship static sites and services to Render with direct artifacts or repo triggers.',
      features: ['Static artifact uploads', 'Service redeploy triggers'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#render-adapter',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'github-pages',
      title: 'GitHub Pages',
      category: 'platform',
      description: 'Publish documentation and static sites to GitHub Pages.',
      features: ['Branch deployments', 'GitHub integration'],
      docsUrl: 'https://github.com/kagehq/brail/blob/main/docs/PLATFORMS.md#github-pages-adapter',
      supportsPreview: false,
      supportsProduction: true,
    },
    {
      name: 'cloudflare-workers',
      title: 'Cloudflare Workers',
      category: 'platform',
      description: 'Deploy serverless functions to Cloudflare\'s global edge network with KV storage support.',
      features: ['Edge deployment', 'KV storage integration', 'Instant global distribution'],
      docsUrl: 'https://developers.cloudflare.com/workers/',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'cloudflare-sandbox',
      title: 'Cloudflare Sandbox (Beta)',
      category: 'dynamic',
      description: 'Execute untrusted code securely in isolated containers with Durable Objects integration.',
      features: ['Container isolation', 'AI code execution', 'Preview URLs', 'File management'],
      docsUrl: 'https://developers.cloudflare.com/sandbox/',
      supportsPreview: true,
      supportsProduction: true,
    },
    {
      name: 'vercel-sandbox',
      title: 'Vercel Sandbox',
      category: 'dynamic',
      description: 'Run isolated development environments with node22 and python3.13 runtime support.',
      features: ['Configurable vCPUs (1-4)', 'Command execution', 'Git-based deployments'],
      docsUrl: 'https://vercel.com/docs/vercel-sandbox',
      supportsPreview: true,
      supportsProduction: true,
    },
  ];

  async listAdapters(): Promise<AdapterCatalogEntry[]> {
    const catalogUrl = process.env.ADAPTER_CATALOG_URL;

    if (!catalogUrl) {
      return this.fallbackCatalog;
    }

    if (this.cache && Date.now() - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cache;
    }

    try {
      const response = await fetch(catalogUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid catalog payload');
      }

      const parsed = data.filter((entry) => typeof entry?.name === 'string');
      this.cache = parsed;
      this.cacheTimestamp = Date.now();
      return parsed;
    } catch (error: any) {
      this.logger.warn(
        `Falling back to bundled adapter catalog: ${error?.message || error}`,
      );
      this.cache = this.fallbackCatalog;
      this.cacheTimestamp = Date.now();
      return this.fallbackCatalog;
    }
  }
}
