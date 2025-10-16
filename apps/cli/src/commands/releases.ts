import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { ApiClient, formatBytes } from '@br/shared';
import { requireConfig } from '../config.js';

interface ReleasesOptions {
  site?: string;
}

/**
 * List releases for a site
 */
export async function releasesCommand(options: ReleasesOptions) {
  const config = await requireConfig();
  const api = new ApiClient({
    baseUrl: config.apiUrl,
    token: config.token,
  });

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

  const spinner = ora('Loading releases...').start();

  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/releases`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const releases = await response.json() as any[];

    spinner.stop();

    if (releases.length === 0) {
      console.log(chalk.yellow('\n⚠ No releases found\n'));
      return;
    }

    console.log(chalk.bold(`\n🚀 Releases (${releases.length})\n`));

    for (const release of releases) {
      const statusBadge =
        release.status === 'active'
          ? chalk.green('● active')
          : release.status === 'staged'
            ? chalk.blue('○ staged')
            : chalk.red('✗ failed');

      const targetBadge =
        release.target === 'production'
          ? chalk.magenta('[production]')
          : chalk.dim('[preview]');

      console.log(`${statusBadge} ${targetBadge} ${chalk.cyan(release.deployId)}`);
      console.log(chalk.dim(`  Adapter: ${release.adapter}`));
      console.log(chalk.dim(`  Created: ${new Date(release.createdAt).toLocaleString()}`));
      
      if (release.previewUrl) {
        console.log(chalk.dim(`  Preview URL: ${chalk.cyan(release.previewUrl)}`));
      }
      
      if (release.platformDeploymentId) {
        console.log(chalk.dim(`  Platform ID: ${release.platformDeploymentId}`));
      }
      
      if (release.destinationRef) {
        console.log(chalk.dim(`  Destination: ${release.destinationRef}`));
      }
      
      if (release.deploy) {
        console.log(
          chalk.dim(
            `  Files: ${release.deploy.fileCount} (${formatBytes(release.deploy.byteSize)})`,
          ),
        );
      }
      console.log();
    }
  } catch (error: any) {
    spinner.fail(`Failed to load releases: ${error.message}`);
    process.exit(1);
  }
}

