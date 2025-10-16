import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { requireConfig } from '../config.js';
import prompts from 'prompts';

interface AuditOptions {
  site?: string;
  from?: string;
  to?: string;
  action?: string;
  json?: boolean;
  limit?: number;
}

/**
 * View or export site audit history
 */
export async function auditCommand(options: AuditOptions) {
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

  const spinner = ora('Loading audit events...').start();

  try {
    // Build query params
    const params = new URLSearchParams();
    if (options.from) params.append('from', new Date(options.from).toISOString());
    if (options.to) params.append('to', new Date(options.to).toISOString());
    if (options.action) params.append('action', options.action);
    if (options.limit) params.append('limit', options.limit.toString());

    // Fetch audit events
    const url = `${config.apiUrl}/v1/sites/${siteId}/audit${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const events = (await response.json()) as any[];

    spinner.stop();

    if (!events || events.length === 0) {
      console.log(chalk.yellow('\n⚠ No audit events found\n'));
      return;
    }

    // Output as JSON if requested
    if (options.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }

    // Output as table
    console.log(chalk.bold(`\n📋 Audit History (${events.length} events)\n`));

    const table = new Table({
      head: ['Time', 'Action', 'User', 'Location', 'Deploy', 'Meta'],
      style: {
        head: ['cyan'],
      },
      colWidths: [20, 20, 15, 10, 15, 30],
      wordWrap: true,
    });

    for (const event of events) {
      const meta =
        event.meta && Object.keys(event.meta).length > 0
          ? Object.entries(event.meta)
              .map(([k, v]) => `${k}:${v}`)
              .join(', ')
          : '-';

      table.push([
        new Date(event.createdAt).toLocaleString(),
        event.action,
        event.userId ? event.userId.slice(0, 12) + '...' : '-',
        event.country || '-',
        event.deployId ? event.deployId.slice(0, 12) + '...' : '-',
        meta,
      ]);
    }

    console.log(table.toString());
    console.log(chalk.dim(`\nShowing ${events.length} event(s)\n`));
  } catch (error: any) {
    spinner.fail(`Failed to load audit events: ${error.message}`);
    process.exit(1);
  }
}
