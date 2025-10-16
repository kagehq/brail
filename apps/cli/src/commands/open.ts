import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OpenOptions {
  site?: string;
  deploy?: string;
  preview?: boolean;
}

/**
 * Open deployment URL in browser
 */
export async function openCommand(options: OpenOptions) {
  const config = await requireConfig();

  let deployId = options.deploy;
  let siteId = options.site;

  // If no deploy ID and no site, prompt for site
  if (!deployId && !siteId) {
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

  const spinner = ora('Loading deployment...').start();

  try {
    let url: string | null = null;

    // If deploy ID provided, get that specific deployment
    if (deployId) {
      const releaseResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/releases`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });

      if (!releaseResponse.ok) {
        throw new Error(`HTTP ${releaseResponse.status}`);
      }

      const releases = await releaseResponse.json() as any[];
      const release = releases.find((r: any) => r.deployId === deployId);

      if (!release) {
        throw new Error('Deployment not found');
      }

      url = release.previewUrl || null;
    } else if (siteId) {
      // Get active deployment for site
      const siteResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });

      if (!siteResponse.ok) {
        throw new Error(`HTTP ${siteResponse.status}`);
      }

      const site = await siteResponse.json() as any;

      if (!site.activeDeployId) {
        spinner.fail('No active deployment found');
        console.log(chalk.yellow('\n⚠ Deploy something first with: br drop <dir> -s ' + siteId + '\n'));
        process.exit(1);
      }

      // Get release info
      const releaseResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/releases`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });

      if (releaseResponse.ok) {
        const releases = await releaseResponse.json() as any[];
        const release = releases.find((r: any) => r.deployId === site.activeDeployId);

        if (release?.previewUrl) {
          url = release.previewUrl;
        }
      }

      // Fallback to public URL
      if (!url && site.domains && site.domains.length > 0) {
        const domain = site.domains.find((d: any) => d.verified);
        if (domain) {
          url = `https://${domain.domain}`;
        }
      }

      // Last fallback to local API public serving
      if (!url) {
        url = `${config.apiUrl}/public/${siteId}/`;
      }
    }

    if (!url) {
      spinner.fail('No URL found for deployment');
      console.log(chalk.yellow('\n⚠ Unable to determine deployment URL\n'));
      process.exit(1);
    }

    spinner.succeed(`Opening: ${chalk.cyan(url)}`);

    // Open URL in default browser
    const platform = process.platform;
    const command = platform === 'darwin' 
      ? `open "${url}"` 
      : platform === 'win32' 
        ? `start "${url}"` 
        : `xdg-open "${url}"`;

    await execAsync(command);

    console.log();

  } catch (error: any) {
    spinner.fail(`Failed to open deployment: ${error.message}`);
    process.exit(1);
  }
}

