import chalk from 'chalk';
import { requireConfig } from '../config.js';
import { ApiClient } from '@br/shared';

/**
 * List available adapters
 */
export async function adaptersCommand() {
  console.log(chalk.bold('\n📦 Available Adapters\n'));

  // Hardcoded for now - in a real implementation, these would come from the API
  const adapters = [
    {
      name: 'ssh-rsync',
      description: 'Deploy to VPS/dedicated servers via SSH+rsync',
      fields: [
        'host (string, required) - SSH hostname',
        'port (number, default: 22) - SSH port',
        'user (string, required) - SSH username',
        'privateKey (string, required) - SSH private key (PEM format)',
        'basePath (string, required) - Remote base path (e.g., /var/www/my-site)',
        'keepReleases (number, default: 5) - Number of releases to keep',
        'health.mode (enum: url|canary) - Health check mode',
        'health.url (string) - URL to poll for health check',
        'health.canaryPath (string) - URL to canary file',
        'health.timeoutMs (number, default: 8000) - Health check timeout',
        'health.retries (number, default: 5) - Health check retries',
      ],
    },
    {
      name: 's3',
      description: 'Deploy to S3-compatible storage (AWS, Cloudflare R2, etc.)',
      fields: [
        'endpoint (string, optional) - S3 endpoint URL',
        'region (string, required) - AWS region',
        'bucket (string, required) - S3 bucket name',
        'prefix (string, required) - Object key prefix',
        'accessKeyId (string, required) - AWS access key ID',
        'secretAccessKey (string, required) - AWS secret access key',
        'forcePathStyle (boolean, default: false) - Use path-style URLs',
        'keepReleases (number, default: 5) - Number of releases to keep',
      ],
    },
    {
      name: 'vercel',
      description: 'Deploy to Vercel (preview & production deployments)',
      fields: [
        'token (string, required) - Vercel API token',
        'teamId (string, optional) - Vercel team ID',
        'projectId (string, optional) - Vercel project ID (auto-created if omitted)',
        'projectName (string, optional) - Vercel project name',
        'framework (enum: static|nextjs|other, default: static) - Framework type',
        'productionDomain (string, optional) - Production domain',
      ],
    },
    {
      name: 'cloudflare-pages',
      description: 'Deploy to Cloudflare Pages (preview & production)',
      fields: [
        'accountId (string, required) - Cloudflare account ID',
        'apiToken (string, required) - Cloudflare API token',
        'projectName (string, optional) - Pages project name (auto-created if omitted)',
        'productionDomain (string, optional) - Custom production domain',
      ],
    },
    {
      name: 'railway',
      description: 'Deploy to Railway via GraphQL API',
      fields: [
        'token (string, required) - Railway API token',
        'projectId (string, required) - Railway project ID',
        'environmentId (string, required) - Railway environment ID',
        'serviceName (string, optional) - Service name (default: static-site)',
      ],
    },
    {
      name: 'fly',
      description: 'Deploy to Fly.io with Docker containers',
      fields: [
        'accessToken (string, required) - Fly.io access token',
        'appName (string, optional) - Fly.io app name (auto-generated if omitted)',
        'org (string, optional) - Fly.io organization (default: personal)',
      ],
    },
  ];

  for (const adapter of adapters) {
    console.log(chalk.cyan.bold(`${adapter.name}`));
    console.log(chalk.dim(`  ${adapter.description}\n`));
    console.log(chalk.bold('  Configuration:'));
    for (const field of adapter.fields) {
      console.log(`    • ${field}`);
    }
    console.log();
  }

  console.log(chalk.dim('Use "br profiles add --adapter <name>" to create a profile\n'));
}

