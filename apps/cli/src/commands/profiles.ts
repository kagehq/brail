import { readFile } from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { ApiClient } from '@br/shared';
import { requireConfig } from '../config.js';

interface ProfilesOptions {
  site?: string;
  name?: string;
  adapter?: string;
  // SSH options
  host?: string;
  port?: number;
  user?: string;
  privateKey?: string;
  basePath?: string;
  keepReleases?: number;
  'health.mode'?: string;
  'health.url'?: string;
  'health.canaryPath'?: string;
  'health.timeoutMs'?: number;
  'health.retries'?: number;
  // S3 options
  endpoint?: string;
  region?: string;
  bucket?: string;
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  // Vercel options
  token?: string;
  teamId?: string;
  projectId?: string;
  projectName?: string;
  framework?: string;
  productionDomain?: string;
  // Cloudflare Pages options
  accountId?: string;
  apiToken?: string;
  // Railway options
  environmentId?: string;
  serviceName?: string;
  // Fly options
  accessToken?: string;
  appName?: string;
  org?: string;
}

/**
 * Add a new connection profile
 */
export async function profilesAddCommand(options: ProfilesOptions) {
  console.log(chalk.bold('\n➕ Add Connection Profile\n'));

  const config = await requireConfig();
  const api = new ApiClient({
    baseUrl: config.apiUrl,
    token: config.token,
  });

  // Get required fields
  let siteId = options.site;
  let name = options.name;
  let adapter = options.adapter;

  if (!siteId) {
    const answer = await prompts({
      type: 'text',
      name: 'siteId',
      message: 'Site ID:',
      validate: (value) => value.length > 0 || 'Site ID is required',
    });
    if (!answer.siteId) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    siteId = answer.siteId;
  }

  if (!name) {
    const answer = await prompts({
      type: 'text',
      name: 'name',
      message: 'Profile name:',
      validate: (value) => value.length > 0 || 'Name is required',
    });
    if (!answer.name) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    name = answer.name;
  }

  if (!adapter) {
    const answer = await prompts({
      type: 'select',
      name: 'adapter',
      message: 'Adapter:',
      choices: [
        { title: 'SSH+rsync', value: 'ssh-rsync' },
        { title: 'S3', value: 's3' },
        { title: 'Vercel', value: 'vercel' },
        { title: 'Cloudflare Pages', value: 'cloudflare-pages' },
        { title: 'Railway (Beta)', value: 'railway' },
        { title: 'Fly.io (Beta)', value: 'fly' },
      ],
    });
    if (!answer.adapter) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    adapter = answer.adapter;
  }

  // Build config based on adapter
  let adapterConfig: any;

  if (adapter === 'ssh-rsync') {
    adapterConfig = await buildSshConfig(options);
  } else if (adapter === 's3') {
    adapterConfig = await buildS3Config(options);
  } else if (adapter === 'vercel') {
    adapterConfig = await buildVercelConfig(options);
  } else if (adapter === 'cloudflare-pages') {
    adapterConfig = await buildCloudflareConfig(options);
  } else if (adapter === 'railway') {
    adapterConfig = await buildRailwayConfig(options);
  } else if (adapter === 'fly') {
    adapterConfig = await buildFlyConfig(options);
  } else {
    throw new Error(`Unknown adapter: ${adapter}`);
  }

  // Create profile
  const spinner = ora('Creating profile...').start();

  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        name,
        adapter,
        config: adapterConfig,
      }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const profile: any = await response.json();

    spinner.succeed(`Profile created: ${chalk.cyan(profile.id)}`);
    console.log(chalk.dim(`\nProfile: ${name} (${adapter})`));
    console.log(chalk.dim(`Site: ${siteId}\n`));
  } catch (error: any) {
    spinner.fail(`Failed to create profile: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List profiles for a site
 */
export async function profilesListCommand(options: ProfilesOptions) {
  const config = await requireConfig();
  const api = new ApiClient({
    baseUrl: config.apiUrl,
    token: config.token,
  });

  let siteId = options.site;

  if (!siteId) {
    const answer = await prompts({
      type: 'text',
      name: 'siteId',
      message: 'Site ID:',
      validate: (value) => value.length > 0 || 'Site ID is required',
    });
    if (!answer.siteId) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    siteId = answer.siteId;
  }

  const spinner = ora('Loading profiles...').start();

  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/profiles`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const profiles = await response.json() as any[];

    spinner.stop();

    if (profiles.length === 0) {
      console.log(chalk.yellow('\n⚠ No profiles found\n'));
      return;
    }

    console.log(chalk.bold(`\n📋 Connection Profiles (${profiles.length})\n`));

    for (const profile of profiles) {
      const defaultBadge = profile.isDefault ? chalk.green(' [DEFAULT]') : '';
      console.log(chalk.cyan(`${profile.name}${defaultBadge}`));
      console.log(chalk.dim(`  ID: ${profile.id}`));
      console.log(chalk.dim(`  Adapter: ${profile.adapter}`));
      console.log(chalk.dim(`  Created: ${new Date(profile.createdAt).toLocaleString()}`));
      console.log();
    }
  } catch (error: any) {
    spinner.fail(`Failed to load profiles: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Set default profile
 */
export async function profilesDefaultCommand(options: ProfilesOptions) {
  const config = await requireConfig();

  let siteId = options.site;
  let name = options.name;

  if (!siteId || !name) {
    console.log(chalk.red('\n✗ --site and --name are required\n'));
    process.exit(1);
  }

  const spinner = ora('Loading profiles...').start();

  try {
    // Get profiles to find ID by name
    const listResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/profiles`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}`);
    }

    const profiles = await listResponse.json() as any[];
    const profile = profiles.find((p: any) => p.name === name);

    if (!profile) {
      spinner.fail(`Profile not found: ${name}`);
      process.exit(1);
    }

    // Set as default
    const response = await fetch(
      `${config.apiUrl}/v1/sites/${siteId}/profiles/${profile.id}/default`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    spinner.succeed(`Set ${chalk.cyan(name)} as default profile`);
  } catch (error: any) {
    spinner.fail(`Failed to set default: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Build SSH config from options or prompts
 */
async function buildSshConfig(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Host
  if (options.host) {
    config.host = options.host;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'host',
      message: 'SSH host:',
      validate: (value) => value.length > 0 || 'Host is required',
    });
    if (!answer.host) throw new Error('Cancelled');
    config.host = answer.host;
  }

  // Port
  config.port = options.port || 22;

  // User
  if (options.user) {
    config.user = options.user;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'user',
      message: 'SSH user:',
      initial: 'deploy',
      validate: (value) => value.length > 0 || 'User is required',
    });
    if (!answer.user) throw new Error('Cancelled');
    config.user = answer.user;
  }

  // Private key
  if (options.privateKey) {
    let keyContent = options.privateKey;
    // Support @file syntax
    if (keyContent.startsWith('@')) {
      const filePath = keyContent.substring(1).replace(/^~/, process.env.HOME || '~');
      keyContent = await readFile(filePath, 'utf-8');
    }
    config.privateKey = keyContent;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'privateKey',
      message: 'Private key path (or @path to file):',
      initial: '@~/.ssh/id_rsa',
    });
    if (!answer.privateKey) throw new Error('Cancelled');
    let keyContent = answer.privateKey;
    if (keyContent.startsWith('@')) {
      const filePath = keyContent.substring(1).replace(/^~/, process.env.HOME || '~');
      keyContent = await readFile(filePath, 'utf-8');
    }
    config.privateKey = keyContent;
  }

  // Base path
  if (options.basePath) {
    config.basePath = options.basePath;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'basePath',
      message: 'Base path on server:',
      initial: '/var/www/my-site',
      validate: (value) => value.length > 0 || 'Base path is required',
    });
    if (!answer.basePath) throw new Error('Cancelled');
    config.basePath = answer.basePath;
  }

  // Keep releases
  config.keepReleases = options.keepReleases || 5;

  // Health check (optional)
  const healthMode = options['health.mode'];
  if (healthMode) {
    config.health = {
      mode: healthMode,
      timeoutMs: options['health.timeoutMs'] || 8000,
      retries: options['health.retries'] || 5,
    };

    if (healthMode === 'url' && options['health.url']) {
      config.health.url = options['health.url'];
    } else if (healthMode === 'canary' && options['health.canaryPath']) {
      config.health.canaryPath = options['health.canaryPath'];
    }
  }

  return config;
}

/**
 * Build S3 config from options or prompts
 */
async function buildS3Config(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Bucket
  if (options.bucket) {
    config.bucket = options.bucket;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'bucket',
      message: 'S3 bucket:',
      validate: (value) => value.length > 0 || 'Bucket is required',
    });
    if (!answer.bucket) throw new Error('Cancelled');
    config.bucket = answer.bucket;
  }

  // Prefix
  if (options.prefix) {
    config.prefix = options.prefix;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'prefix',
      message: 'Prefix (folder path):',
      initial: 'my-site',
      validate: (value) => value.length > 0 || 'Prefix is required',
    });
    if (!answer.prefix) throw new Error('Cancelled');
    config.prefix = answer.prefix;
  }

  // Region
  if (options.region) {
    config.region = options.region;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'region',
      message: 'AWS region:',
      initial: 'us-east-1',
      validate: (value) => value.length > 0 || 'Region is required',
    });
    if (!answer.region) throw new Error('Cancelled');
    config.region = answer.region;
  }

  // Access key
  if (options.accessKeyId) {
    config.accessKeyId = options.accessKeyId;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'accessKeyId',
      message: 'Access key ID:',
      validate: (value) => value.length > 0 || 'Access key is required',
    });
    if (!answer.accessKeyId) throw new Error('Cancelled');
    config.accessKeyId = answer.accessKeyId;
  }

  // Secret key
  if (options.secretAccessKey) {
    config.secretAccessKey = options.secretAccessKey;
  } else {
    const answer = await prompts({
      type: 'password',
      name: 'secretAccessKey',
      message: 'Secret access key:',
      validate: (value) => value.length > 0 || 'Secret key is required',
    });
    if (!answer.secretAccessKey) throw new Error('Cancelled');
    config.secretAccessKey = answer.secretAccessKey;
  }

  // Optional: endpoint
  if (options.endpoint) {
    config.endpoint = options.endpoint;
  }

  // Optional: force path style
  config.forcePathStyle = options.forcePathStyle || false;

  // Keep releases
  config.keepReleases = options.keepReleases || 5;

  return config;
}

/**
 * Build Vercel config from options or prompts
 */
async function buildVercelConfig(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Token
  if (options.token) {
    let tokenContent = options.token;
    // Support @file syntax
    if (tokenContent.startsWith('@')) {
      const filePath = tokenContent.substring(1).replace(/^~/, process.env.HOME || '~');
      tokenContent = await readFile(filePath, 'utf-8');
      tokenContent = tokenContent.trim();
    }
    config.token = tokenContent;
  } else {
    const answer = await prompts({
      type: 'password',
      name: 'token',
      message: 'Vercel API token (or @path to file):',
      validate: (value) => value.length > 0 || 'Token is required',
    });
    if (!answer.token) throw new Error('Cancelled');
    let tokenContent = answer.token;
    if (tokenContent.startsWith('@')) {
      const filePath = tokenContent.substring(1).replace(/^~/, process.env.HOME || '~');
      tokenContent = await readFile(filePath, 'utf-8');
      tokenContent = tokenContent.trim();
    }
    config.token = tokenContent;
  }

  // Optional: Team ID
  if (options.teamId) {
    config.teamId = options.teamId;
  }

  // Optional: Project name
  if (options.projectName) {
    config.projectName = options.projectName;
  }

  // Optional: Production domain
  if (options.productionDomain) {
    config.productionDomain = options.productionDomain;
  }

  // Optional: Framework
  config.framework = options.framework || 'static';

  return config;
}

/**
 * Build Cloudflare Pages config from options or prompts
 */
async function buildCloudflareConfig(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Account ID
  if (options.accountId) {
    config.accountId = options.accountId;
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'accountId',
      message: 'Cloudflare account ID:',
      validate: (value) => value.length > 0 || 'Account ID is required',
    });
    if (!answer.accountId) throw new Error('Cancelled');
    config.accountId = answer.accountId;
  }

  // API Token
  if (options.apiToken) {
    let tokenContent = options.apiToken;
    // Support @file syntax
    if (tokenContent.startsWith('@')) {
      const filePath = tokenContent.substring(1).replace(/^~/, process.env.HOME || '~');
      tokenContent = await readFile(filePath, 'utf-8');
      tokenContent = tokenContent.trim();
    }
    config.apiToken = tokenContent;
  } else {
    const answer = await prompts({
      type: 'password',
      name: 'apiToken',
      message: 'Cloudflare API token (or @path to file):',
      validate: (value) => value.length > 0 || 'API token is required',
    });
    if (!answer.apiToken) throw new Error('Cancelled');
    let tokenContent = answer.apiToken;
    if (tokenContent.startsWith('@')) {
      const filePath = tokenContent.substring(1).replace(/^~/, process.env.HOME || '~');
      tokenContent = await readFile(filePath, 'utf-8');
      tokenContent = tokenContent.trim();
    }
    config.apiToken = tokenContent;
  }

  // Optional: Project name
  if (options.projectName) {
    config.projectName = options.projectName;
  }

  // Optional: Production domain
  if (options.productionDomain) {
    config.productionDomain = options.productionDomain;
  }

  return config;
}

/**
 * Build Railway config from options or prompts
 */
async function buildRailwayConfig(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Token
  if (options.token) {
    let tokenContent = options.token;
    // Support @file syntax
    if (tokenContent.startsWith('@')) {
      const filePath = tokenContent.substring(1).replace(/^~/, process.env.HOME || '~');
      tokenContent = await readFile(filePath, 'utf-8');
      tokenContent = tokenContent.trim();
    }
    config.token = tokenContent;
  } else {
    const answer = await prompts({
      type: 'password',
      name: 'token',
      message: 'Railway API token:',
      validate: (value) => value.length > 0 || 'Token is required',
    });
    if (!answer.token) throw new Error('Cancelled');
    config.token = answer.token;
  }

  // Project ID
  if (options.projectId) {
    config.projectId = options.projectId;
  } else {
    const projectAnswer = await prompts({
      type: 'text',
      name: 'projectId',
      message: 'Railway project ID:',
      validate: (value) => value.length > 0 || 'Project ID is required',
    });
    if (!projectAnswer.projectId) throw new Error('Cancelled');
    config.projectId = projectAnswer.projectId;
  }

  // Environment ID
  if (options.environmentId) {
    config.environmentId = options.environmentId;
  } else {
    const envAnswer = await prompts({
      type: 'text',
      name: 'environmentId',
      message: 'Railway environment ID:',
      validate: (value) => value.length > 0 || 'Environment ID is required',
    });
    if (!envAnswer.environmentId) throw new Error('Cancelled');
    config.environmentId = envAnswer.environmentId;
  }

  // Optional: Service name
  if (options.serviceName) {
    config.serviceName = options.serviceName;
  }

  return config;
}

/**
 * Build Fly.io config from options or prompts
 */
async function buildFlyConfig(options: ProfilesOptions): Promise<any> {
  const config: any = {};

  // Access Token
  if (options.accessToken) {
    config.accessToken = options.accessToken;
  } else {
    const answer = await prompts({
      type: 'password',
      name: 'accessToken',
      message: 'Fly.io access token:',
      validate: (value) => value.length > 0 || 'Access token is required',
    });
    if (!answer.accessToken) throw new Error('Cancelled');
    config.accessToken = answer.accessToken;
  }

  // Optional: App name
  if (options.appName) {
    config.appName = options.appName;
  }

  // Optional: Org
  if (options.org) {
    config.org = options.org;
  }

  return config;
}

/**
 * Get profile details
 */
export async function profilesGetCommand(options: { site?: string; id?: string }) {
  const config = await requireConfig();

  let siteId = options.site;
  let profileId = options.id;

  if (!siteId || !profileId) {
    console.log(chalk.red('\n✗ --site and --id are required\n'));
    process.exit(1);
  }

  const spinner = ora('Loading profile...').start();

  try {
    const response = await fetch(
      `${config.apiUrl}/v1/sites/${siteId}/profiles/${profileId}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const profile = await response.json() as any;

    spinner.stop();

    console.log(chalk.bold(`\n📋 Profile: ${profile.name}\n`));
    console.log(chalk.dim(`ID: ${profile.id}`));
    console.log(chalk.dim(`Adapter: ${profile.adapter}`));
    console.log(chalk.dim(`Site: ${profile.siteId}`));
    console.log(chalk.dim(`Created: ${new Date(profile.createdAt).toLocaleString()}`));
    console.log(chalk.dim(`Updated: ${new Date(profile.updatedAt).toLocaleString()}`));
    
    if (profile.isDefault) {
      console.log(chalk.green('\n✓ This is the default profile'));
    }

    console.log(chalk.bold('\nConfiguration:'));
    console.log(chalk.dim(JSON.stringify(profile.config, null, 2)));
  } catch (error: any) {
    spinner.fail(`Failed to load profile: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Update profile
 */
export async function profilesUpdateCommand(options: {
  site?: string;
  id?: string;
  name?: string;
  config?: string;
}) {
  const config = await requireConfig();

  let siteId = options.site;
  let profileId = options.id;

  if (!siteId || !profileId) {
    console.log(chalk.red('\n✗ --site and --id are required\n'));
    process.exit(1);
  }

  const body: any = {};

  if (options.name) {
    body.name = options.name;
  }

  if (options.config) {
    try {
      body.config = JSON.parse(options.config);
    } catch (error) {
      console.log(chalk.red('\n✗ Invalid JSON for --config\n'));
      process.exit(1);
    }
  }

  if (Object.keys(body).length === 0) {
    console.log(chalk.yellow('\n⚠ No changes specified. Use --name or --config\n'));
    process.exit(1);
  }

  const spinner = ora('Updating profile...').start();

  try {
    const response = await fetch(
      `${config.apiUrl}/v1/sites/${siteId}/profiles/${profileId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const profile: any = await response.json();

    spinner.succeed(`Profile updated: ${chalk.cyan(profile.name)}`);
  } catch (error: any) {
    spinner.fail(`Failed to update profile: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Delete profile
 */
export async function profilesRemoveCommand(options: {
  site?: string;
  id?: string;
  yes?: boolean;
}) {
  const config = await requireConfig();

  let siteId = options.site;
  let profileId = options.id;

  if (!siteId || !profileId) {
    console.log(chalk.red('\n✗ --site and --id are required\n'));
    process.exit(1);
  }

  if (!options.yes) {
    const answer = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Delete profile ${profileId}?`,
      initial: false,
    });

    if (!answer.confirm) {
      console.log(chalk.dim('\nCancelled'));
      process.exit(0);
    }
  }

  const spinner = ora('Deleting profile...').start();

  try {
    const response = await fetch(
      `${config.apiUrl}/v1/sites/${siteId}/profiles/${profileId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    spinner.succeed('Profile deleted');
  } catch (error: any) {
    spinner.fail(`Failed to delete profile: ${error.message}`);
    process.exit(1);
  }
}

