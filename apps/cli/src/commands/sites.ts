import { Command } from 'commander';
import { loadConfig } from '../config.js';
import chalk from 'chalk';

const sitesCommand = new Command('sites')
  .description('Manage sites');

// Create site
sitesCommand
  .command('create <name>')
  .description('Create a new site')
  .action(async (name: string) => {
    try {
      const config = await loadConfig();
      
      const response = await fetch(`${config!.apiUrl}/v1/sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config!.token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to create site'}`));
        process.exit(1);
      }

      const site: any = await response.json();
      console.log(chalk.green(`✓ Site created successfully`));
      console.log(chalk.dim(`\nSite ID: ${site.id}`));
      console.log(chalk.dim(`Name: ${site.name}`));
      console.log(chalk.dim(`Created: ${new Date(site.createdAt).toLocaleString()}`));
      
      console.log(chalk.blue(`\n💡 Next step: Deploy to your new site`));
      console.log(chalk.dim(`   br drop ./dist --site ${site.id}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// List sites
sitesCommand
  .command('list')
  .alias('ls')
  .description('List all sites')
  .option('--json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const config = await loadConfig();
      
      const response = await fetch(`${config!.apiUrl}/v1/sites`, {
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to list sites'}`));
        process.exit(1);
      }

      const sites = await response.json() as any[];

      if (options.json) {
        console.log(JSON.stringify(sites, null, 2));
        return;
      }

      if (sites.length === 0) {
        console.log(chalk.yellow('No sites found'));
        console.log(chalk.dim('\nCreate your first site:'));
        console.log(chalk.blue('  br sites create my-site'));
        return;
      }

      console.log(chalk.bold(`\n${sites.length} site(s) found:\n`));
      
      for (const site of sites) {
        console.log(chalk.bold(site.name));
        console.log(chalk.dim(`  ID: ${site.id}`));
        if (site.activeDeployId) {
          console.log(chalk.dim(`  Active Deploy: ${site.activeDeployId}`));
        }
        console.log(chalk.dim(`  Created: ${new Date(site.createdAt).toLocaleString()}`));
        console.log();
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Get site
sitesCommand
  .command('get <siteId>')
  .description('Get site details')
  .option('--json', 'Output as JSON')
  .action(async (siteId: string, options: { json?: boolean }) => {
    try {
      const config = await loadConfig();
      
      const response = await fetch(`${config!.apiUrl}/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to get site'}`));
        process.exit(1);
      }

      const site: any = await response.json();

      if (options.json) {
        console.log(JSON.stringify(site, null, 2));
        return;
      }

      console.log(chalk.bold(`\n${site.name}\n`));
      console.log(chalk.dim(`ID: ${site.id}`));
      console.log(chalk.dim(`Organization: ${site.orgId}`));
      if (site.activeDeployId) {
        console.log(chalk.dim(`Active Deploy: ${site.activeDeployId}`));
      }
      console.log(chalk.dim(`Created: ${new Date(site.createdAt).toLocaleString()}`));
      console.log(chalk.dim(`Updated: ${new Date(site.updatedAt).toLocaleString()}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Delete site
sitesCommand
  .command('rm <siteId>')
  .alias('delete')
  .description('Delete a site')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (siteId: string, options: { yes?: boolean }) => {
    try {
      const config = await loadConfig();

      // Get site details first
      const siteResponse = await fetch(`${config!.apiUrl}/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!siteResponse.ok) {
        console.error(chalk.red(`Error: Site not found`));
        process.exit(1);
      }

      const site: any = await siteResponse.json();

      if (!options.yes) {
        console.log(chalk.yellow(`\n⚠️  This will permanently delete site "${site.name}" (${site.id})`));
        console.log(chalk.dim('   All deployments, releases, and configurations will be removed.'));
        console.log(chalk.red('\n   This action cannot be undone!\n'));
        
        const { default: prompts } = await import('prompts');
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this site?',
          initial: false,
        });

        if (!confirm) {
          console.log(chalk.dim('\nCancelled'));
          process.exit(0);
        }
      }

      const response = await fetch(`${config!.apiUrl}/v1/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config!.token}`,
        },
      });

      if (!response.ok) {
        const error: any = await response.json();
        console.error(chalk.red(`Error: ${error.message || 'Failed to delete site'}`));
        process.exit(1);
      }

      console.log(chalk.green(`✓ Site deleted successfully`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

export { sitesCommand };

