import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';
import { formatBytes } from '@br/shared';

interface StatusOptions {
  site?: string;
  deploy?: string;
}

/**
 * Show deployment status
 */
export async function statusCommand(options: StatusOptions) {
  const config = await requireConfig();

  let siteId = options.site;
  let deployId = options.deploy;

  // Prompt for site if not provided
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

  const spinner = ora('Loading site status...').start();

  try {
    // Fetch site details
    const siteResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!siteResponse.ok) {
      throw new Error(`HTTP ${siteResponse.status}`);
    }

    const site = await siteResponse.json() as any;

    // Fetch releases
    const releasesResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/releases`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!releasesResponse.ok) {
      throw new Error(`HTTP ${releasesResponse.status}`);
    }

    const releases = await releasesResponse.json() as any[];

    spinner.stop();

    // Display site status
    console.log(chalk.bold(`\n📊 Site Status\n`));
    console.log(`${chalk.dim('Site ID:')}       ${chalk.cyan(site.id)}`);
    console.log(`${chalk.dim('Name:')}          ${site.name}`);
    console.log(`${chalk.dim('Created:')}       ${new Date(site.createdAt).toLocaleString()}`);
    
    if (site.activeDeployId) {
      console.log(`${chalk.dim('Active Deploy:')} ${chalk.green(site.activeDeployId)}`);
    } else {
      console.log(`${chalk.dim('Active Deploy:')} ${chalk.yellow('none')}`);
    }

    // Display domains
    if (site.domains && site.domains.length > 0) {
      console.log(`${chalk.dim('Domains:')}`);
      for (const domain of site.domains) {
        const verifiedBadge = domain.verified ? chalk.green('✓') : chalk.yellow('○');
        console.log(`  ${verifiedBadge} ${domain.domain}`);
      }
    }

    // Display recent releases
    if (releases.length > 0) {
      console.log(chalk.bold(`\n📦 Recent Releases (${releases.length})\n`));
      
      const recentReleases = releases.slice(0, 5);
      for (const release of recentReleases) {
        const statusBadge =
          release.status === 'active'
            ? chalk.green('● active  ')
            : release.status === 'staged'
              ? chalk.blue('○ staged  ')
              : chalk.red('✗ failed  ');

        const targetBadge =
          release.target === 'production'
            ? chalk.magenta('[production]')
            : chalk.dim('[preview]   ');

        console.log(`${statusBadge} ${targetBadge} ${chalk.cyan(release.deployId)}`);
        console.log(chalk.dim(`  Adapter:  ${release.adapter}`));
        console.log(chalk.dim(`  Created:  ${new Date(release.createdAt).toLocaleString()}`));
        
        if (release.previewUrl) {
          console.log(chalk.dim(`  URL:      ${chalk.cyan(release.previewUrl)}`));
        }
        
        if (release.deploy) {
          console.log(
            chalk.dim(
              `  Files:    ${release.deploy.fileCount} (${formatBytes(release.deploy.byteSize)})`,
            ),
          );
        }
        console.log();
      }

      if (releases.length > 5) {
        console.log(chalk.dim(`... and ${releases.length - 5} more releases\n`));
      }
    } else {
      console.log(chalk.yellow('\n⚠ No releases found\n'));
    }

    // Show connection profiles
    const profilesResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/profiles`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (profilesResponse.ok) {
      const profiles = await profilesResponse.json() as any[];
      if (profiles.length > 0) {
        console.log(chalk.bold(`🔗 Connection Profiles (${profiles.length})\n`));
        for (const profile of profiles) {
          const defaultBadge = profile.isDefault ? chalk.green('★ ') : '  ';
          console.log(`${defaultBadge}${chalk.cyan(profile.name)} ${chalk.dim(`(${profile.adapter})`)}`);
        }
        console.log();
      }
    }

  } catch (error: any) {
    spinner.fail(`Failed to load status: ${error.message}`);
    process.exit(1);
  }
}

