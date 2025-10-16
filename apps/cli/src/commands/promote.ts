import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';

interface PromoteOptions {
  site: string;
  to: string;
  profile?: string;
  yes?: boolean;
}

export async function promoteCommand(options: PromoteOptions) {
  console.log(chalk.bold('\n🚀 Promoting to Production\n'));
  
  // Load config
  const config = await requireConfig();
  
  // Confirm
  if (!options.yes) {
    const answer = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Promote deployment ${options.to} to production?`,
      initial: false,
    });
    
    if (!answer.confirm) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
  }
  
  const spinner = ora('Promoting to production...').start();
  
  try {
    const body: any = {
      target: 'production',
    };
    
    if (options.profile) {
      body.profileId = options.profile;
    }
    
    const response = await fetch(
      `${config.apiUrl}/v1/deploys/${options.to}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(body),
      },
    );
    
    if (!response.ok) {
      const error: any = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    spinner.succeed('Promoted to production');
    console.log(chalk.green('\n✓ Deployment is now live in production\n'));
  } catch (error: any) {
    spinner.fail(`Failed to promote: ${error.message}`);
    process.exit(1);
  }
}

