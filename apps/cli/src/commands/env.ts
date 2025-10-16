import { Command } from 'commander';
import { getApiClient } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const SCOPE_CHOICES = [
  'build',
  'runtime:preview',
  'runtime:production',
  'adapter:vercel',
  'adapter:cloudflare',
  'adapter:netlify',
  'adapter:railway',
  'adapter:fly',
  'adapter:s3',
  'adapter:github-pages',
  'adapter:ftp',
  'adapter:ssh-rsync',
  'ssh-agent',
];

/**
 * Parse .env file format
 */
function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      console.warn(`Skipping invalid line: ${line}`);
      continue;
    }

    const [, key, value] = match;
    
    // Remove quotes if present
    let cleanValue = value;
    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
      cleanValue = cleanValue.slice(1, -1);
    }

    vars[key] = cleanValue;
  }

  return vars;
}

/**
 * Format environment variables as .env file
 */
function formatEnvFile(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([key, value]) => {
    // Quote values that contain spaces or special characters
    const needsQuotes = /[\s#]/.test(value);
    const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
    return `${key}=${quotedValue}`;
  });

  return lines.join('\n') + '\n';
}

export const envCommand = new Command('env')
  .description('Manage environment variables for sites')
  .addCommand(
    new Command('list')
      .description('List environment variables')
      .requiredOption('--site <siteId>', 'Site ID')
      .option('--scope <scope>', `Scope to filter by (${SCOPE_CHOICES.slice(0, 3).join(', ')}, ...)`)
      .action(async (options) => {
        try {
          const api = await getApiClient();
          const params = options.scope ? `?scope=${options.scope}` : '';
          const response = await api.get(`/v1/sites/${options.site}/env${params}`);

          if (!response.data || response.data.length === 0) {
            console.log('No environment variables found.');
            return;
          }

          // Group by scope
          const grouped: Record<string, any[]> = {};
          for (const envVar of response.data) {
            if (!grouped[envVar.scope]) {
              grouped[envVar.scope] = [];
            }
            grouped[envVar.scope].push(envVar);
          }

          // Display
          for (const [scope, vars] of Object.entries(grouped)) {
            console.log(`\n${scope}:`);
            console.log('─'.repeat(50));
            
            for (const envVar of vars) {
              const secretBadge = envVar.isSecret ? '🔒' : '  ';
              const value = envVar.value.length > 50 
                ? envVar.value.substring(0, 47) + '...'
                : envVar.value;
              
              console.log(`${secretBadge} ${envVar.key}=${value}`);
            }
          }

          console.log('');
        } catch (error: any) {
          console.error('Failed to list environment variables:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set an environment variable')
      .argument('<KEY=VALUE>', 'Environment variable to set (e.g., API_URL=https://api.example.com)')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--scope <scope>', `Variable scope (${SCOPE_CHOICES.slice(0, 3).join(', ')}, ...)`)
      .option('--public', 'Make this variable non-secret (visible without reveal)')
      .action(async (keyValue: string, options) => {
        try {
          // Parse KEY=VALUE
          const match = keyValue.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
          if (!match) {
            console.error('Invalid format. Use KEY=VALUE (e.g., API_URL=https://api.example.com)');
            process.exit(1);
          }

          const [, key, value] = match;

          const api = await getApiClient();
          await api.post(`/v1/sites/${options.site}/env`, {
            scope: options.scope,
            key,
            value,
            isSecret: !options.public,
          });

          const secretBadge = options.public ? '' : '🔒 ';
          console.log(`${secretBadge}Set ${options.scope}:${key}`);
        } catch (error: any) {
          console.error('Failed to set environment variable:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete an environment variable')
      .argument('<KEY>', 'Environment variable key to delete')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--scope <scope>', 'Variable scope')
      .option('--yes', 'Skip confirmation')
      .action(async (key: string, options) => {
        try {
          // Validate key format
          if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
            console.error('Invalid key format. Must start with A-Z or _, and contain only A-Z, 0-9, and _');
            process.exit(1);
          }

          // Confirm unless --yes
          if (!options.yes) {
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise<void>((resolve, reject) => {
              rl.question(`Delete ${options.scope}:${key}? (y/N): `, (answer: string) => {
                rl.close();
                if (answer.toLowerCase() !== 'y') {
                  console.log('Cancelled.');
                  process.exit(0);
                }
                resolve();
              });
            });
          }

          const api = await getApiClient();
          await api.delete(`/v1/sites/${options.site}/env`, {
            data: {
              scope: options.scope,
              key,
            },
          });

          console.log(`Deleted ${options.scope}:${key}`);
        } catch (error: any) {
          console.error('Failed to delete environment variable:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('import')
      .description('Import environment variables from a file')
      .argument('<file>', 'Path to .env file')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--scope <scope>', 'Variable scope')
      .option('--public', 'Import all variables as non-secret')
      .option('--yes', 'Skip confirmation')
      .action(async (file: string, options) => {
        try {
          // Read file
          const filePath = path.resolve(process.cwd(), file);
          if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${file}`);
            process.exit(1);
          }

          const content = fs.readFileSync(filePath, 'utf-8');
          const vars = parseEnvFile(content);

          const count = Object.keys(vars).length;
          if (count === 0) {
            console.log('No variables found in file.');
            return;
          }

          console.log(`Found ${count} variables in ${file}`);

          // Confirm unless --yes
          if (!options.yes) {
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            await new Promise<void>((resolve) => {
              rl.question(`Import ${count} variables to ${options.scope}? (y/N): `, (answer: string) => {
                rl.close();
                if (answer.toLowerCase() !== 'y') {
                  console.log('Cancelled.');
                  process.exit(0);
                }
                resolve();
              });
            });
          }

          const api = await getApiClient();
          const response = await api.post(`/v1/sites/${options.site}/env/bulk`, {
            scope: options.scope,
            vars,
            isSecret: !options.public,
          });

          console.log(`✓ Imported ${response.data.count} variables to ${options.scope}`);
        } catch (error: any) {
          console.error('Failed to import environment variables:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('export')
      .description('Export environment variables to a file')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--scope <scope>', 'Variable scope')
      .option('--output <file>', 'Output file (default: stdout)')
      .action(async (options) => {
        try {
          const api = await getApiClient();
          const response = await api.get(`/v1/sites/${options.site}/env/export?scope=${options.scope}`);

          const vars = response.data;
          const content = formatEnvFile(vars);

          if (options.output) {
            const outputPath = path.resolve(process.cwd(), options.output);
            fs.writeFileSync(outputPath, content, 'utf-8');
            console.log(`✓ Exported ${Object.keys(vars).length} variables to ${options.output}`);
          } else {
            console.log(content);
          }
        } catch (error: any) {
          console.error('Failed to export environment variables:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('reveal')
      .description('Reveal the actual value of a secret variable')
      .argument('<KEY>', 'Environment variable key to reveal')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--scope <scope>', 'Variable scope')
      .action(async (key: string, options) => {
        try {
          const api = await getApiClient();
          const response = await api.get(`/v1/sites/${options.site}/env/${options.scope}/${key}/reveal`);

          console.log(response.data.value);
        } catch (error: any) {
          console.error('Failed to reveal environment variable:', error.response?.data?.message || error.message);
          process.exit(1);
        }
      })
  );

