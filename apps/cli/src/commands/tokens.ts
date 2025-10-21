import { Command } from 'commander';
import { loadConfig } from '../config.js';
import chalk from 'chalk';

const tokensCommand = new Command('tokens')
  .description('Manage API tokens');

// Create token
tokensCommand
  .command('create')
  .description('Create a new API token')
  .option('-n, --name <name>', 'Token name')
  .option('-s, --site <siteId>', 'Site ID (optional, for site-specific tokens)')
  .option('--scopes <scopes>', 'Comma-separated scopes (default: deploy:write)', 'deploy:write')
  .option('--expires <date>', 'Expiration date (YYYY-MM-DD)')
  .action(async (options: { name?: string; site?: string; scopes?: string; expires?: string }) => {
    try {
      const config = await loadConfig();

      let tokenName = options.name;
      if (!tokenName) {
        const { default: prompts } = await import('prompts');
        const response = await prompts({
          type: 'text',
          name: 'name',
          message: 'Token name:',
          initial: 'cli-token',
        });
        tokenName = response.name;
      }

      if (!tokenName) {
        console.error(chalk.red('Error: Token name is required'));
        process.exit(1);
      }

      const body: any = {
        name: tokenName,
        scopes: (options.scopes || 'deploy:write').split(',').map(s => s.trim()),
      };

      if (options.site) {
        body.siteId = options.site;
      }

      if (options.expires) {
        body.expiresAt = options.expires;
      }

      const response = await fetch(`${config!.apiUrl}/v1/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config!.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to create token'}`));
        process.exit(1);
      }

      const result: any = await response.json();
      
      console.log(chalk.green(`✓ Token created successfully\n`));
      console.log(chalk.bold('Token ID:'), result.token.id);
      console.log(chalk.bold('Name:'), result.token.name);
      console.log(chalk.bold('Scopes:'), result.token.scopes.join(', '));
      if (result.token.siteId) {
        console.log(chalk.bold('Site:'), result.token.siteId);
      }
      if (result.token.expiresAt) {
        console.log(chalk.bold('Expires:'), new Date(result.token.expiresAt).toLocaleString());
      }
      
      console.log(chalk.yellow(`\n⚠️  Save this token - it won't be shown again:`));
      console.log(chalk.cyan.bold(`\n${result.tokenPlain}\n`));
      
      console.log(chalk.dim('Add to your environment:'));
      console.log(chalk.blue(`  export BRAIL_TOKEN="${result.tokenPlain}"`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// List tokens
tokensCommand
  .command('list')
  .alias('ls')
  .description('List all API tokens')
  .option('--json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const config = await loadConfig();
      
      const response = await fetch(`${config!.apiUrl}/v1/tokens`, {
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to list tokens'}`));
        process.exit(1);
      }

      const tokens = await response.json() as any[];

      if (options.json) {
        console.log(JSON.stringify(tokens, null, 2));
        return;
      }

      if (tokens.length === 0) {
        console.log(chalk.yellow('No tokens found'));
        console.log(chalk.dim('\nCreate your first token:'));
        console.log(chalk.blue('  br tokens create --name "my-token"'));
        return;
      }

      console.log(chalk.bold(`\n${tokens.length} token(s) found:\n`));
      
      for (const token of tokens) {
        const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
        const status = isExpired ? chalk.red('(expired)') : chalk.green('(active)');
        
        console.log(chalk.bold(`${token.name} ${status}`));
        console.log(chalk.dim(`  ID: ${token.id}`));
        console.log(chalk.dim(`  Scopes: ${token.scopes.join(', ')}`));
        if (token.siteId) {
          console.log(chalk.dim(`  Site: ${token.siteId}`));
        }
        console.log(chalk.dim(`  Created: ${new Date(token.createdAt).toLocaleString()}`));
        if (token.expiresAt) {
          console.log(chalk.dim(`  Expires: ${new Date(token.expiresAt).toLocaleString()}`));
        }
        console.log();
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Delete token
tokensCommand
  .command('rm <tokenId>')
  .alias('delete')
  .description('Delete an API token')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (tokenId: string, options: { yes?: boolean }) => {
    try {
      const config = await loadConfig();

      if (!options.yes) {
        const { default: prompts } = await import('prompts');
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Delete token ${tokenId}?`,
          initial: false,
        });

        if (!confirm) {
          console.log(chalk.dim('Cancelled'));
          process.exit(0);
        }
      }

      const response = await fetch(`${config!.apiUrl}/v1/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to delete token'}`));
        process.exit(1);
      }

      console.log(chalk.green(`✓ Token deleted successfully`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

export { tokensCommand };

