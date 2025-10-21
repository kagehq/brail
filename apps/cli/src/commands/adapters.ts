import chalk from 'chalk';
import { requireConfig } from '../config.js';
import { ApiClient } from '@br/shared';

interface CatalogEntry {
  name: string;
  title: string;
  category: string;
  description: string;
  features?: string[];
  docsUrl?: string;
  supportsPreview?: boolean;
  supportsProduction?: boolean;
}

const FALLBACK_ADAPTERS: CatalogEntry[] = [
  {
    name: 'ssh-rsync',
    title: 'SSH + rsync',
    category: 'traditional',
    description: 'Deploy to private servers over SSH with release retention.',
    features: ['Atomic deploys', 'Health checks'],
  },
  {
    name: 'ftp',
    title: 'FTP / FTPS',
    category: 'traditional',
    description: 'Upload static assets to shared hosting via FTP or FTPS.',
  },
  {
    name: 's3',
    title: 'Amazon S3 & Compatible',
    category: 'storage',
    description: 'Push static builds to S3, MinIO, or any S3-compatible storage.',
    features: ['Release pointers'],
  },
  {
    name: 'vercel',
    title: 'Vercel',
    category: 'platform',
    description: 'Preview deployments and production promotion on Vercel.',
    features: ['Preview URLs', 'Production promotion'],
  },
  {
    name: 'cloudflare-pages',
    title: 'Cloudflare Pages',
    category: 'platform',
    description: 'Global CDN deployments for static sites.',
  },
  {
    name: 'netlify',
    title: 'Netlify',
    category: 'platform',
    description: 'Jamstack deployments with build command support.',
  },
  {
    name: 'railway',
    title: 'Railway',
    category: 'platform',
    description: 'Trigger Railway deployments via GraphQL.',
  },
  {
    name: 'fly',
    title: 'Fly.io',
    category: 'platform',
    description: 'Run Dockerized applications close to your users.',
  },
  {
    name: 'render',
    title: 'Render',
    category: 'platform',
    description: 'Static artifacts and service redeploys on Render.com.',
  },
  {
    name: 'github-pages',
    title: 'GitHub Pages',
    category: 'platform',
    description: 'Publish repositories to GitHub Pages.',
  },
  {
    name: 'cloudflare-workers',
    title: 'Cloudflare Workers',
    category: 'platform',
    description: 'Serverless functions on Cloudflare edge network with KV storage.',
    features: ['Edge deployment', 'KV storage', 'Instant global distribution'],
  },
  {
    name: 'cloudflare-sandbox',
    title: 'Cloudflare Sandbox (Beta)',
    category: 'dynamic',
    description: 'Secure code execution in isolated containers powered by Durable Objects.',
    features: ['Container isolation', 'AI code execution', 'Preview URLs'],
  },
  {
    name: 'vercel-sandbox',
    title: 'Vercel Sandbox',
    category: 'dynamic',
    description: 'Isolated development environments with node22/python3.13 runtimes.',
    features: ['Configurable vCPUs', 'Command execution', 'Git-based deployments'],
  },
];

function formatSupports(adapter: CatalogEntry): string | null {
  const supports: string[] = [];
  if (adapter.supportsPreview) supports.push('preview');
  if (adapter.supportsProduction ?? true) supports.push('production');
  return supports.length > 0 ? supports.join(' + ') : null;
}

function printAdapter(adapter: CatalogEntry) {
  console.log(chalk.cyan.bold(adapter.title || adapter.name));

  if (adapter.description) {
    console.log(chalk.dim(`  ${adapter.description}\n`));
  }

  console.log(chalk.bold('  Category:'), adapter.category);

  if (adapter.features?.length) {
    console.log(chalk.bold('  Highlights:'));
    adapter.features.forEach((feature) => {
      console.log(`    • ${feature}`);
    });
  }

  const supports = formatSupports(adapter);
  if (supports) {
    console.log(chalk.bold('  Supports:'), supports);
  }

  if (adapter.docsUrl) {
    console.log(chalk.dim(`  Docs: ${adapter.docsUrl}`));
  }

  console.log();
}

/**
 * List available adapters
 */
export async function adaptersCommand() {
  console.log(chalk.bold('\n📦 Available Adapters\n'));

  let adapters: CatalogEntry[] = FALLBACK_ADAPTERS;

  try {
    const config = await requireConfig();
    const api = new ApiClient({ baseUrl: config.apiUrl, token: config.token });
    const remote = await api.fetch<CatalogEntry[]>('/v1/catalog/adapters');

    if (Array.isArray(remote) && remote.length > 0) {
      adapters = remote;
    }
  } catch (error: any) {
    console.log(chalk.dim(`Using bundled catalog: ${error?.message || error}`));
  }

  adapters
    .slice()
    .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name))
    .forEach(printAdapter);

  console.log(
    chalk.dim('Use "br profiles add --adapter <name>" to create a profile\n'),
  );
}

