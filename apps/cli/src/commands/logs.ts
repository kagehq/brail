import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { requireConfig } from '../config.js';
import { io, Socket } from 'socket.io-client';

interface LogsOptions {
  site?: string;
  deploy?: string;
  follow?: boolean;
  limit?: number;
}

/**
 * Show deployment logs
 */
export async function logsCommand(options: LogsOptions) {
  const config = await requireConfig();

  let deployId = options.deploy;

  // If no deploy ID provided, fetch from site
  if (!deployId && options.site) {
    const spinner = ora('Loading latest deploy...').start();
    try {
      const response = await fetch(`${config.apiUrl}/v1/sites/${options.site}`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const site = await response.json() as any;
      deployId = site.activeDeployId;
      spinner.stop();
      if (!deployId) {
        console.log(chalk.yellow('\n⚠ Site has no active deployment\n'));
        process.exit(1);
      }
    } catch (error: any) {
      spinner.fail(`Failed to load site: ${error.message}`);
      process.exit(1);
    }
  }

  // Prompt for deploy ID if still not provided
  if (!deployId) {
    const answer = await prompts({
      type: 'text',
      name: 'deployId',
      message: 'Deploy ID:',
      validate: (value) => value.length > 0 || 'Deploy ID is required',
    });
    if (!answer.deployId) {
      console.log(chalk.red('\n✗ Cancelled\n'));
      process.exit(1);
    }
    deployId = answer.deployId;
  }

  // Fetch historical logs
  const spinner = ora('Loading logs...').start();
  try {
    const limit = options.limit || 100;
    const response = await fetch(
      `${config.apiUrl}/v1/deploys/${deployId}/logs?limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${config.token}` },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const logs = await response.json() as any[];
    spinner.stop();

    if (logs.length === 0) {
      console.log(chalk.yellow('\n⚠ No logs found\n'));
      if (!options.follow) {
        return;
      }
    } else {
      console.log(chalk.bold(`\n📋 Deployment Logs (${deployId})\n`));
      printLogs(logs);
    }

    // Follow mode - connect to WebSocket
    if (options.follow) {
      console.log(chalk.dim('\n--- Following live logs (Ctrl+C to exit) ---\n'));
      
      const apiUrl = config.apiUrl.replace(/^http/, 'ws');
      const socket: Socket = io(`${apiUrl}/logs`, {
        auth: { token: config.token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log(chalk.dim('Connected to live logs\n'));
        socket.emit('subscribe-deploy', deployId);
      });

      socket.on('log', (log: any) => {
        printLog(log);
      });

      socket.on('status', (status: any) => {
        const statusColor = status.status === 'success' ? 'green' : 
                           status.status === 'failed' ? 'red' : 'yellow';
        console.log(chalk[statusColor](`\n▶ Status: ${status.status}`));
        if (status.message) {
          console.log(chalk.dim(`  ${status.message}`));
        }
        console.log();
      });

      socket.on('disconnect', () => {
        console.log(chalk.dim('\nDisconnected from live logs'));
        process.exit(0);
      });

      socket.on('connect_error', (error: any) => {
        console.log(chalk.red(`\n✗ Connection error: ${error.message}\n`));
        process.exit(1);
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log(chalk.dim('\n\n👋 Closing connection...\n'));
        socket.disconnect();
        process.exit(0);
      });
    }
  } catch (error: any) {
    spinner.fail(`Failed to load logs: ${error.message}`);
    process.exit(1);
  }
}

function printLogs(logs: any[]) {
  for (const log of logs) {
    printLog(log);
  }
}

function printLog(log: any) {
  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const level = log.level || 'info';
  
  let levelBadge = '';
  switch (level) {
    case 'error':
      levelBadge = chalk.red('✗ ERROR');
      break;
    case 'warn':
      levelBadge = chalk.yellow('⚠ WARN ');
      break;
    case 'debug':
      levelBadge = chalk.gray('◦ DEBUG');
      break;
    default:
      levelBadge = chalk.blue('ℹ INFO ');
  }

  console.log(`${chalk.dim(timestamp)} ${levelBadge} ${log.message}`);
  
  if (log.metadata) {
    const metadata = typeof log.metadata === 'string' 
      ? JSON.parse(log.metadata) 
      : log.metadata;
    console.log(chalk.dim(`  ${JSON.stringify(metadata, null, 2)}`));
  }
}

