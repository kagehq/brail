import { readFile } from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';

interface ReplaceOptions {
  site?: string;
  dest?: string;
  yes?: boolean;
}

export async function replaceCommand(localFile: string, options: ReplaceOptions) {
  console.log(chalk.bold('\n🔄 Brail Path Patch - Replace File\n'));
  
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
  
  // Get destination path
  let destPath = options.dest;
  
  if (!destPath) {
    const answer = await prompts({
      type: 'text',
      name: 'destPath',
      message: 'Destination path (e.g., /css/app.css):',
      validate: (value) => value.length > 0 || 'Destination path is required',
    });
    
    if (!answer.destPath) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    
    destPath = answer.destPath;
  }
  
  // Ensure destPath is not undefined
  if (!destPath) {
    console.log(chalk.red('\n✗ Destination path is required\n'));
    process.exit(1);
  }
  
  const spinner = ora('Reading file...').start();
  
  // Read local file
  let content: Buffer;
  try {
    content = await readFile(localFile);
    spinner.succeed(`Read file: ${chalk.bold(localFile)} (${content.length} bytes)`);
  } catch (error: any) {
    spinner.fail(`Failed to read file: ${error.message}`);
    process.exit(1);
  }
  
  // Determine content type
  const contentType = getContentType(destPath);
  
  // Upload patch
  spinner.start('Creating patch deploy...');
  
  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        destPath,
        contentB64: content.toString('base64'),
        contentType,
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
      console.log(chalk.green(`\n✓ Replaced ${chalk.bold(destPath)}`));
      console.log(chalk.dim(`  Deploy: ${result.deployId}`));
      console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(`${config.apiUrl.replace('/v1', '')}/public/${siteId}/`)}\n`));
    } else {
      spinner.succeed('Patch deployed');
      console.log(chalk.green(`\n✓ Replaced ${chalk.bold(destPath)}`));
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
    spinner.fail(`Failed to patch: ${error.message}`);
    process.exit(1);
  }
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
  };
  
  return types[ext || ''] || 'application/octet-stream';
}

