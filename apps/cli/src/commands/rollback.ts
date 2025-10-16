import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { ApiClient } from '@br/shared';
import { requireConfig } from '../config.js';

interface RollbackOptions {
  site?: string;
  to?: string;
  profile?: string;
  adapter?: string;
}

export async function rollbackCommand(options: RollbackOptions) {
  console.log(chalk.bold('\n⏪ Rollback Deployment\n'));
  
  // Load config
  const config = await requireConfig();
  const api = new ApiClient({
    baseUrl: config.apiUrl,
    token: config.token,
  });
  
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
  
  // Get deploy ID
  let deployId = options.to;
  
  if (!deployId) {
    // List available deploys
    const spinner = ora('Loading deployments...').start();
    
    let deploys;
    try {
      deploys = await api.listDeploys(siteId!);
      spinner.stop();
    } catch (error: any) {
      spinner.fail(`Failed to load deployments: ${error.message}`);
      process.exit(1);
    }
    
    if (deploys.length === 0) {
      console.log(chalk.yellow('\n⚠ No deployments found\n'));
      process.exit(0);
    }
    
    // Show list
    console.log(chalk.bold('\nAvailable deployments:\n'));
    
    for (const deploy of deploys) {
      const statusBadge =
        deploy.status === 'active' ? chalk.green('● active') : chalk.dim('○ ' + deploy.status);
      
      console.log(
        `  ${statusBadge} ${chalk.dim(deploy.id)} (${new Date(deploy.createdAt).toLocaleString()})`,
      );
    }
    
    console.log();
    
    const answer = await prompts({
      type: 'text',
      name: 'deployId',
      message: 'Deploy ID to rollback to:',
      validate: (value) => value.length > 0 || 'Deploy ID is required',
    });
    
    if (!answer.deployId) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    
    deployId = answer.deployId;
  }
  
  // Confirm
  const confirm = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Rollback to ${deployId}?`,
    initial: false,
  });
  
  if (!confirm.confirmed) {
    console.log(chalk.yellow('\n✗ Cancelled\n'));
    process.exit(0);
  }
  
  // Rollback
  const spinner = ora('Rolling back...').start();
  
  try {
    // Check if using adapter (profile or adapter flag)
    if (options.profile || options.adapter) {
      // Use adapter rollback API
      const rollbackBody: any = {
        toDeployId: deployId,
      };
      
      if (options.profile) {
        rollbackBody.profileId = options.profile;
      } else if (options.adapter) {
        rollbackBody.adapter = options.adapter;
      }
      
      const response = await fetch(
        `${config.apiUrl}/v1/sites/${siteId}/rollback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`,
          },
          body: JSON.stringify(rollbackBody),
        },
      );
      
      if (!response.ok) {
        const error: any = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      spinner.succeed('Rollback complete');
      console.log(chalk.bold(`\n✓ Rolled back to ${chalk.cyan(deployId)}\n`));
    } else {
      // Legacy Phase-0 activation
      const result = await api.activateDeploy(deployId!);
      spinner.succeed('Rollback complete');
      console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(result.publicUrl)}\n`));
    }
  } catch (error: any) {
    spinner.fail(`Rollback failed: ${error.message}`);
    process.exit(1);
  }
}

