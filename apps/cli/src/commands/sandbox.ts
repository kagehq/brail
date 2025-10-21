import { Command } from 'commander';
import { loadConfig } from '../config.js';
import chalk from 'chalk';
import { createReadStream, statSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const sandboxCommand = new Command('sandbox')
  .description('Create and manage sandboxes');

// Helper to collect files recursively
function collectFiles(dir: string, baseDir: string = dir): { path: string; fullPath: string }[] {
  const files: { path: string; fullPath: string }[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else {
      files.push({
        path: relative(baseDir, fullPath),
        fullPath,
      });
    }
  }

  return files;
}

// Create sandbox
sandboxCommand
  .command('create <path>')
  .description('Create a sandbox environment')
  .requiredOption('-p, --provider <provider>', 'Sandbox provider (vercel-sandbox | cloudflare-sandbox)')
  .option('--token <token>', 'Vercel API token')
  .option('--runtime <runtime>', 'Vercel runtime (node22 | python3.13)', 'node22')
  .option('--vcpus <vcpus>', 'Vercel vCPUs', '2')
  .option('--account-id <id>', 'Cloudflare account ID')
  .option('--api-token <token>', 'Cloudflare API token')
  .option('--sandbox-binding <name>', 'Cloudflare sandbox binding name')
  .option('--build-cmd <cmd>', 'Build command')
  .option('--start-cmd <cmd>', 'Start command')
  .option('--name <name>', 'Sandbox name')
  .action(async (path: string, options: {
    provider: string;
    token?: string;
    runtime?: string;
    vcpus?: string;
    accountId?: string;
    apiToken?: string;
    sandboxBinding?: string;
    buildCmd?: string;
    startCmd?: string;
    name?: string;
  }) => {
    try {
      const config = await loadConfig();

      // Validate provider
      if (!['vercel-sandbox', 'cloudflare-sandbox'].includes(options.provider)) {
        console.error(chalk.red('Error: Provider must be vercel-sandbox or cloudflare-sandbox'));
        process.exit(1);
      }

      // Validate provider-specific options
      if (options.provider === 'vercel-sandbox' && !options.token) {
        console.error(chalk.red('Error: --token is required for Vercel sandbox'));
        process.exit(1);
      }

      if (options.provider === 'cloudflare-sandbox' && (!options.accountId || !options.apiToken)) {
        console.error(chalk.red('Error: --account-id and --api-token are required for Cloudflare sandbox'));
        process.exit(1);
      }

      // Check if path exists
      try {
        const stat = statSync(path);
        if (!stat.isDirectory()) {
          console.error(chalk.red('Error: Path must be a directory'));
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Error: Path not found: ${path}`));
        process.exit(1);
      }

      console.log(chalk.blue(`Creating ${options.provider} sandbox...`));
      console.log(chalk.dim(`Uploading files from ${path}...\n`));

      // Collect files
      const files = collectFiles(path);
      console.log(chalk.dim(`Found ${files.length} files`));

      // Build config object
      const sandboxConfig: any = {};

      if (options.provider === 'vercel-sandbox') {
        sandboxConfig.token = options.token;
        sandboxConfig.runtime = options.runtime;
        sandboxConfig.vcpus = parseInt(options.vcpus || '2');
      } else {
        sandboxConfig.accountId = options.accountId;
        sandboxConfig.apiToken = options.apiToken;
        if (options.sandboxBinding) {
          sandboxConfig.sandboxBinding = options.sandboxBinding;
        }
      }

      if (options.buildCmd) {
        sandboxConfig.buildCommand = options.buildCmd;
      }
      if (options.startCmd) {
        sandboxConfig.startCommand = options.startCmd;
      }

      // Import FormData dynamically
      // @ts-ignore - form-data will be installed at runtime
      const { default: FormData } = await import('form-data');
      
      // Create form data
      const form = new FormData();
      form.append('provider', options.provider);
      form.append('config', JSON.stringify(sandboxConfig));
      
      if (options.name) {
        form.append('siteName', options.name);
      }

      // Add files
      for (const file of files) {
        form.append('files', createReadStream(file.fullPath), {
          filepath: file.path,
        });
      }

      // Upload
      const response = await fetch(`${config!.apiUrl}/v1/sandboxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config!.token}`,
          ...(form.getHeaders() as any),
        },
        body: form as any,
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to create sandbox'}`));
        process.exit(1);
      }

      const result: any = await response.json();

      console.log(chalk.green(`\n✓ Sandbox created successfully!\n`));
      console.log(chalk.bold('Sandbox URL:'), chalk.cyan(result.url));
      console.log(chalk.dim(`Deploy ID: ${result.deployId}`));
      console.log(chalk.dim(`Site ID: ${result.siteId}`));
      
      if (result.previewUrl) {
        console.log(chalk.dim(`Preview URL: ${result.previewUrl}`));
      }

      console.log(chalk.blue(`\n💡 Your sandbox is ready to use!`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

export { sandboxCommand };

