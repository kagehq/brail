#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { dropCommand } from './commands/drop.js';
import { rollbackCommand } from './commands/rollback.js';
import { promoteCommand } from './commands/promote.js';
import { adaptersCommand } from './commands/adapters.js';
import {
  profilesAddCommand,
  profilesListCommand,
  profilesDefaultCommand,
} from './commands/profiles.js';
import { releasesCommand } from './commands/releases.js';
import { logsCommand } from './commands/logs.js';
import { statusCommand } from './commands/status.js';
import { openCommand } from './commands/open.js';
import { configCommand } from './commands/config.js';
import { replaceCommand } from './commands/replace.js';
import { replaceDirCommand } from './commands/replace-dir.js';
import { deletePathsCommand } from './commands/delete-paths.js';
import { watchCommand } from './commands/watch.js';
import { auditCommand } from './commands/audit.js';
import { buildCommand } from './commands/build.js';
import {
  domainAddCommand,
  domainListCommand,
  domainVerifyCommand,
  domainRemoveCommand,
} from './commands/domain.js';

const program = new Command();

program
  .name('br')
  .description('Brail CLI - Instant Static Deploys')
  .version('0.1.0');

program
  .command('login')
  .description('Login and save authentication token')
  .action(loginCommand);

program
  .command('init')
  .description('Initialize _drop.json configuration file')
  .action(initCommand);

program
  .command('drop <dir>')
  .description('Deploy a directory')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-y, --yes', 'Automatically activate after upload')
  .option('-p, --profile <name>', 'Use connection profile')
  .option('-a, --adapter <name>', 'Adapter name')
  .option('-t, --target <target>', 'Target environment (preview | production)', 'preview')
  .option('--build [cmd]', 'Build before deploy (auto detection or custom command)')
  .option('--framework <framework>', 'Framework (auto|next|astro|vite|nuxt|sveltekit|tanstack)')
  .option('--output <dir>', 'Build output directory')
  .option('--skip-build', 'Skip build even if detected')
  .action(dropCommand);

program
  .command('promote')
  .description('Promote a preview deployment to production')
  .requiredOption('-s, --site <siteId>', 'Site ID')
  .requiredOption('--to <deployId>', 'Deploy ID to promote')
  .option('-p, --profile <name>', 'Use connection profile')
  .option('-y, --yes', 'Skip confirmation')
  .action(promoteCommand);

program
  .command('rollback')
  .description('Rollback to a previous deployment')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-t, --to <deployId>', 'Deploy ID to rollback to')
  .option('-p, --profile <name>', 'Use connection profile (Phase 1)')
  .option('-a, --adapter <name>', 'Adapter name (Phase 1)')
  .action(rollbackCommand);

program
  .command('adapters')
  .description('List available deployment adapters')
  .action(adaptersCommand);

// Profiles commands
const profiles = program
  .command('profiles')
  .description('Manage connection profiles');

profiles
  .command('add')
  .description('Add a new connection profile')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-n, --name <name>', 'Profile name')
  .option('-a, --adapter <adapter>', 'Adapter (ssh-rsync, s3, vercel, cloudflare-pages, railway, fly)')
  .option('--host <host>', 'SSH host')
  .option('--port <port>', 'SSH port', parseInt)
  .option('--user <user>', 'SSH user')
  .option('--privateKey <key>', 'SSH private key (@file to read from file)')
  .option('--basePath <path>', 'SSH base path')
  .option('--keepReleases <n>', 'Number of releases to keep', parseInt)
  .option('--health.mode <mode>', 'Health check mode (url, canary)')
  .option('--health.url <url>', 'Health check URL')
  .option('--health.canaryPath <path>', 'Canary file URL')
  .option('--health.timeoutMs <ms>', 'Health check timeout', parseInt)
  .option('--health.retries <n>', 'Health check retries', parseInt)
  .option('--bucket <bucket>', 'S3 bucket')
  .option('--prefix <prefix>', 'S3 prefix')
  .option('--region <region>', 'AWS region')
  .option('--accessKeyId <key>', 'AWS access key ID')
  .option('--secretAccessKey <secret>', 'AWS secret access key')
  .option('--endpoint <url>', 'S3 endpoint')
  .option('--forcePathStyle', 'Use S3 path-style URLs')
  .option('--token <token>', 'Vercel/Railway API token (@file to read from file)')
  .option('--teamId <id>', 'Vercel team ID')
  .option('--projectId <id>', 'Vercel project ID')
  .option('--projectName <name>', 'Vercel/Cloudflare/Fly project name')
  .option('--framework <framework>', 'Vercel framework (static, nextjs, other)')
  .option('--productionDomain <domain>', 'Vercel/Cloudflare production domain')
  .option('--accountId <id>', 'Cloudflare account ID')
  .option('--apiToken <token>', 'Cloudflare API token (@file to read from file)')
  .option('--environmentId <id>', 'Railway environment ID')
  .option('--serviceName <name>', 'Railway service name')
  .option('--accessToken <token>', 'Fly.io access token')
  .option('--appName <name>', 'Fly.io app name')
  .option('--org <org>', 'Fly.io organization')
  .action(profilesAddCommand);

profiles
  .command('list')
  .description('List connection profiles')
  .option('-s, --site <siteId>', 'Site ID')
  .action(profilesListCommand);

profiles
  .command('default')
  .description('Set default connection profile')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-n, --name <name>', 'Profile name')
  .action(profilesDefaultCommand);

program
  .command('releases')
  .description('List releases for a site')
  .option('-s, --site <siteId>', 'Site ID')
  .action(releasesCommand);

program
  .command('logs')
  .description('Show deployment logs')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-d, --deploy <deployId>', 'Deploy ID')
  .option('-f, --follow', 'Follow live logs (requires WebSocket)')
  .option('-l, --limit <number>', 'Number of logs to show', parseInt)
  .action(logsCommand);

program
  .command('status')
  .description('Show deployment status')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-d, --deploy <deployId>', 'Deploy ID')
  .action(statusCommand);

program
  .command('open')
  .description('Open deployment URL in browser')
  .option('-s, --site <siteId>', 'Site ID')
  .option('-d, --deploy <deployId>', 'Deploy ID')
  .action(openCommand);

program
  .command('config')
  .description('Manage CLI configuration defaults')
  .option('-s, --site <siteId>', 'Set default site ID')
  .option('-a, --adapter <adapter>', 'Set default adapter')
  .option('-t, --target <target>', 'Set default target (preview | production)')
  .option('-l, --list', 'List current configuration')
  .option('--unset <key>', 'Unset a default value')
  .action(configCommand);

program
  .command('replace <localFile>')
  .description('Replace a single file in the current deployment (patch)')
  .option('-s, --site <siteId>', 'Site ID')
  .option('--dest <path>', 'Destination path (e.g., /css/app.css)')
  .option('-y, --yes', 'Automatically activate after patch')
  .action(replaceCommand);

program
  .command('replace-dir <localDir>')
  .description('Replace a directory in the current deployment (patch)')
  .option('-s, --site <siteId>', 'Site ID')
  .option('--dest <path>', 'Destination directory (e.g., /images/)', '/')
  .option('-y, --yes', 'Automatically activate after patch')
  .option('--no-delete', 'Do not delete files that no longer exist locally')
  .option('--ignore <patterns>', 'Glob patterns to ignore')
  .action(replaceDirCommand);

program
  .command('delete-paths')
  .description('Delete paths from the current deployment (patch)')
  .option('-s, --site <siteId>', 'Site ID')
  .option('--paths <paths>', 'Comma-separated paths to delete')
  .option('-y, --yes', 'Automatically activate after patch')
  .action(deletePathsCommand);

program
  .command('watch')
  .description('Watch local directory and auto-patch on changes')
  .option('-s, --site <siteId>', 'Site ID (required)')
  .option('--root <dir>', 'Local directory to watch', '.')
  .option('--base <path>', 'Base path for remote files', '/')
  .option('--ignore <patterns>', 'Glob patterns to ignore')
  .option('--auto', 'Automatically activate patches')
  .action(watchCommand);

program
  .command('audit')
  .description('View or export site audit history')
  .option('-s, --site <siteId>', 'Site ID')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--action <action>', 'Filter by action type')
  .option('--json', 'Output as JSON')
  .option('-l, --limit <number>', 'Maximum number of events to show', parseInt)
  .action(auditCommand);

program
  .command('build [dir]')
  .description('Build a project locally')
  .option('--framework <framework>', 'Framework (auto|next|astro|vite|nuxt|sveltekit|tanstack)')
  .option('--cmd <command>', 'Custom build command')
  .option('--output <dir>', 'Output directory')
  .option('--skip-install', 'Skip dependency installation')
  .action(buildCommand);

// Domain commands
const domain = program
  .command('domain')
  .description('Manage custom domains');

domain
  .command('add <hostname>')
  .description('Add a custom domain')
  .option('-s, --site <siteId>', 'Site ID')
  .action(domainAddCommand);

domain
  .command('list')
  .description('List domains for a site')
  .option('-s, --site <siteId>', 'Site ID')
  .action(domainListCommand);

domain
  .command('verify <hostname>')
  .description('Verify domain DNS configuration')
  .option('-s, --site <siteId>', 'Site ID')
  .action(domainVerifyCommand);

domain
  .command('rm <hostname>')
  .description('Remove a domain')
  .option('-s, --site <siteId>', 'Site ID')
  .action(domainRemoveCommand);

program.parse();
