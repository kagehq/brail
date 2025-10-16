import chalk from 'chalk';
import prompts from 'prompts';
import { loadConfig, saveConfig, requireConfig } from '../config.js';

interface ConfigOptions {
  site?: string;
  adapter?: string;
  target?: string;
  list?: boolean;
  unset?: string;
}

interface ExtendedConfig {
  apiUrl: string;
  token: string;
  defaults?: {
    site?: string;
    adapter?: string;
    target?: string;
    profile?: string;
  };
}

/**
 * Manage CLI configuration defaults
 */
export async function configCommand(options: ConfigOptions) {
  const config = await requireConfig() as ExtendedConfig;

  // Ensure defaults object exists
  if (!config.defaults) {
    config.defaults = {};
  }

  // List all config
  if (options.list) {
    console.log(chalk.bold('\n⚙️  CLI Configuration\n'));
    console.log(`${chalk.dim('API URL:')}      ${config.apiUrl}`);
    console.log(`${chalk.dim('Token:')}        ${chalk.dim('***')}`);
    
    if (Object.keys(config.defaults).length > 0) {
      console.log(chalk.bold('\n📌 Defaults:\n'));
      for (const [key, value] of Object.entries(config.defaults)) {
        if (value) {
          console.log(`  ${chalk.cyan(key.padEnd(12))} ${value}`);
        }
      }
    } else {
      console.log(chalk.dim('\nNo defaults set'));
    }
    console.log();
    return;
  }

  // Unset a default
  if (options.unset) {
    const key = options.unset as keyof typeof config.defaults;
    if (config.defaults[key]) {
      delete config.defaults[key];
      await saveConfig(config);
      console.log(chalk.green(`\n✓ Unset default: ${key}\n`));
    } else {
      console.log(chalk.yellow(`\n⚠ Default not set: ${key}\n`));
    }
    return;
  }

  // Set defaults
  let changed = false;

  if (options.site !== undefined) {
    config.defaults.site = options.site;
    changed = true;
    console.log(chalk.green(`✓ Set default site: ${options.site}`));
  }

  if (options.adapter !== undefined) {
    config.defaults.adapter = options.adapter;
    changed = true;
    console.log(chalk.green(`✓ Set default adapter: ${options.adapter}`));
  }

  if (options.target !== undefined) {
    if (!['preview', 'production'].includes(options.target)) {
      console.log(chalk.red('\n✗ Target must be "preview" or "production"\n'));
      process.exit(1);
    }
    config.defaults.target = options.target;
    changed = true;
    console.log(chalk.green(`✓ Set default target: ${options.target}`));
  }

  if (changed) {
    await saveConfig(config);
    console.log(chalk.green('\n✓ Configuration saved\n'));
  } else {
    // Interactive mode
    const answers = await prompts([
      {
        type: 'text',
        name: 'site',
        message: 'Default site ID (leave empty to skip):',
        initial: config.defaults.site || '',
      },
      {
        type: 'select',
        name: 'adapter',
        message: 'Default adapter:',
        choices: [
          { title: 'None (ask each time)', value: '' },
          { title: 'SSH + Rsync', value: 'ssh-rsync' },
          { title: 'S3 (CDN + Bridge)', value: 's3' },
          { title: 'Vercel', value: 'vercel' },
          { title: 'Cloudflare Pages', value: 'cloudflare-pages' },
          { title: 'Railway', value: 'railway' },
          { title: 'Fly.io', value: 'fly' },
        ],
        initial: config.defaults.adapter ? ['', 'ssh-rsync', 's3', 'vercel', 'cloudflare-pages', 'railway', 'fly'].indexOf(config.defaults.adapter) : 0,
      },
      {
        type: 'select',
        name: 'target',
        message: 'Default target:',
        choices: [
          { title: 'Preview', value: 'preview' },
          { title: 'Production', value: 'production' },
        ],
        initial: config.defaults.target === 'production' ? 1 : 0,
      },
    ]);

    if (answers.site) config.defaults.site = answers.site;
    if (answers.adapter) config.defaults.adapter = answers.adapter;
    if (answers.target) config.defaults.target = answers.target;

    await saveConfig(config);
    console.log(chalk.green('\n✓ Configuration saved\n'));
  }
}

// Helper to get default values
export async function getDefaults(): Promise<ExtendedConfig['defaults']> {
  try {
    const config = await loadConfig() as ExtendedConfig | null;
    return config?.defaults || {};
  } catch {
    return {};
  }
}

