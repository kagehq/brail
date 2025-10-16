import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';

interface DeletePathsOptions {
  site?: string;
  paths?: string;
  yes?: boolean;
}

export async function deletePathsCommand(options: DeletePathsOptions) {
  console.log(chalk.bold('\n🗑️  Brail Path Patch - Delete Paths\n'));
  
  // Load config
  const config = await requireConfig();
  
  // Get site ID
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
  
  // Get paths to delete
  let pathsToDelete: string[] = [];
  
  if (options.paths) {
    pathsToDelete = options.paths.split(',').map(p => p.trim());
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'paths',
      message: 'Paths to delete (comma-separated, e.g., /old,/images/unused.jpg):',
      validate: (value) => value.length > 0 || 'Paths are required',
    });
    
    if (!answer.paths) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    
    pathsToDelete = answer.paths.split(',').map((p: string) => p.trim());
  }
  
  console.log(chalk.dim(`\nDeleting ${pathsToDelete.length} path(s):`));
  pathsToDelete.forEach(p => console.log(chalk.dim(`  - ${p}`)));
  console.log();
  
  const spinner = ora('Creating patch deploy...').start();
  
  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        paths: pathsToDelete,
        activate: options.yes,
      }),
    });
    
    if (!response.ok) {
      const error: any = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result: any = await response.json();
    
    if (options.yes) {
      spinner.succeed('Patch deployed and activated');
      console.log(chalk.green(`\n✓ Deleted ${pathsToDelete.length} path(s)`));
      console.log(chalk.dim(`  Deploy: ${result.deployId}`));
      console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(`${config.apiUrl.replace('/v1', '')}/public/${siteId}/`)}\n`));
    } else {
      spinner.succeed('Patch deployed');
      console.log(chalk.green(`\n✓ Deleted ${pathsToDelete.length} path(s)`));
      console.log(chalk.dim(`  Deploy: ${result.deployId}`));
      
      // Ask to activate
      const answer = await prompts({
        type: 'confirm',
        name: 'activate',
        message: 'Activate this patch now?',
        initial: true,
      });
      
      if (answer.activate) {
        spinner.start('Activating patch...');
        
        const activateResponse = await fetch(
          `${config.apiUrl}/v1/deploys/${result.deployId}/activate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.token}`,
            },
          },
        );
        
        if (!activateResponse.ok) {
          const error: any = await activateResponse.json().catch(() => ({
            message: activateResponse.statusText,
          }));
          throw new Error(error.message || `HTTP ${activateResponse.status}`);
        }
        
        spinner.succeed('Patch activated');
        console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(`${config.apiUrl.replace('/v1', '')}/public/${siteId}/`)}\n`));
      } else {
        console.log(chalk.dim('\nActivate later with "br rollback"\n'));
      }
    }
  } catch (error: any) {
    spinner.fail(`Failed to delete paths: ${error.message}`);
    process.exit(1);
  }
}

