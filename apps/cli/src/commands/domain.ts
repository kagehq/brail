import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';

interface DomainAddOptions {
  site?: string;
}

interface DomainListOptions {
  site?: string;
}

interface DomainVerifyOptions {
  site?: string;
}

interface DomainRemoveOptions {
  site?: string;
}

/**
 * Add a custom domain
 */
export async function domainAddCommand(hostname: string, options: DomainAddOptions) {
  const config = await requireConfig();
  let siteId = options.site;

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

  const spinner = ora(`Adding domain ${hostname}...`).start();

  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostname }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result: any = await response.json();
    spinner.succeed(`Domain added: ${chalk.cyan(hostname)}`);

    // Show DNS instructions
    console.log(chalk.bold('\n📋 DNS Configuration:\n'));
    console.log(`${chalk.dim('Type:')}   ${chalk.white('CNAME')}`);
    console.log(`${chalk.dim('Host:')}   ${chalk.white(result.dnsInstruction.host)}`);
    console.log(`${chalk.dim('Target:')} ${chalk.green(result.dnsInstruction.target)}`);
    console.log(`${chalk.dim('TTL:')}    ${chalk.white(result.dnsInstruction.ttl)}`);

    console.log(chalk.dim('\n→ After updating DNS, run: ') + chalk.white(`br domain verify ${hostname} --site ${siteId}\n`));

  } catch (error: any) {
    spinner.fail('Failed to add domain');
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * List domains for a site
 */
export async function domainListCommand(options: DomainListOptions) {
  const config = await requireConfig();
  let siteId = options.site;

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

  const spinner = ora('Loading domains...').start();

  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const domains: any = await response.json();
    spinner.stop();

    if (domains.length === 0) {
      console.log(chalk.yellow('\n⚠ No domains configured\n'));
      return;
    }

    console.log(chalk.bold(`\n🌐 Domains (${domains.length}):\n`));

    for (const domain of domains) {
      const statusIcon = domain.status === 'verified' ? chalk.green('✓') :
                        domain.status === 'active' ? chalk.green('●') :
                        domain.status === 'securing' ? chalk.yellow('○') :
                        chalk.gray('○');

      console.log(`${statusIcon} ${chalk.cyan(domain.hostname)} ${chalk.dim('→')} ${chalk.gray(domain.cnameTarget)}`);
      console.log(`  ${chalk.dim('Status:')} ${domain.status}`);
      if (domain.certStatus) {
        console.log(`  ${chalk.dim('SSL:')} ${domain.certStatus}`);
      }
      console.log('');
    }

  } catch (error: any) {
    spinner.fail('Failed to load domains');
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Verify domain DNS configuration
 */
export async function domainVerifyCommand(hostname: string, options: DomainVerifyOptions) {
  const config = await requireConfig();
  let siteId = options.site;

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

  const spinner = ora(`Verifying ${hostname}...`).start();

  try {
    // First, get the domain ID
    const listResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}`);
    }

    const domains: any = await listResponse.json();
    const domain = domains.find((d: any) => d.hostname === hostname);

    if (!domain) {
      throw new Error(`Domain ${hostname} not found`);
    }

    // Verify the domain
    const verifyResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains/${domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!verifyResponse.ok) {
      const error: any = await verifyResponse.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${verifyResponse.status}`);
    }

    const result: any = await verifyResponse.json();

    if (result.verification.ok) {
      spinner.succeed(chalk.green(`Domain verified: ${hostname}`));
      console.log(chalk.dim('\n✓ CNAME record found and correct\n'));
    } else {
      spinner.fail(chalk.yellow(`Domain not yet verified: ${hostname}`));
      console.log(chalk.yellow('\n⚠ CNAME record not found or incorrect'));
      if (result.verification.found.length > 0) {
        console.log(chalk.dim('Found: ') + result.verification.found.join(', '));
      }
      console.log(chalk.dim('Expected: ') + result.domain.cnameTarget);
      console.log('');
    }

  } catch (error: any) {
    spinner.fail('Verification failed');
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Remove a domain
 */
export async function domainRemoveCommand(hostname: string, options: DomainRemoveOptions) {
  const config = await requireConfig();
  let siteId = options.site;

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

  // Confirm deletion
  const confirm = await prompts({
    type: 'confirm',
    name: 'value',
    message: `Remove domain ${chalk.red(hostname)}?`,
    initial: false,
  });

  if (!confirm.value) {
    console.log(chalk.dim('\nCancelled\n'));
    return;
  }

  const spinner = ora(`Removing ${hostname}...`).start();

  try {
    // First, get the domain ID
    const listResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}`);
    }

    const domains: any = await listResponse.json();
    const domain = domains.find((d: any) => d.hostname === hostname);

    if (!domain) {
      throw new Error(`Domain ${hostname} not found`);
    }

    // Delete the domain
    const deleteResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}/domains/${domain.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.token}` },
    });

    if (!deleteResponse.ok) {
      const error: any = await deleteResponse.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${deleteResponse.status}`);
    }

    spinner.succeed(`Domain removed: ${chalk.cyan(hostname)}`);
    console.log('');

  } catch (error: any) {
    spinner.fail('Failed to remove domain');
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}
