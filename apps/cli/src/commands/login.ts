import prompts from 'prompts';
import chalk from 'chalk';
import { saveConfig } from '../config.js';

export async function loginCommand() {
  console.log(chalk.bold('\n🔐 Login to Brail\n'));
  
  const answers = await prompts([
    {
      type: 'text',
      name: 'apiUrl',
      message: 'API URL:',
      initial: 'http://localhost:3000',
    },
    {
      type: 'text',
      name: 'token',
      message: 'Personal Access Token:',
      validate: (value) => value.length > 0 || 'Token is required',
    },
  ]);
  
  if (!answers.apiUrl || !answers.token) {
    console.log(chalk.red('\n✗ Login cancelled\n'));
    process.exit(1);
  }
  
  // Clean API URL
  const apiUrl = answers.apiUrl.replace(/\/+$/, '');
  
  try {
    await saveConfig({
      apiUrl,
      token: answers.token,
    });
    
    console.log(chalk.green('\n✓ Login successful!\n'));
    console.log(chalk.dim(`Config saved to ~/.br/config.json\n`));
  } catch (error) {
    console.error(chalk.red(`\n✗ Failed to save config: ${error}\n`));
    process.exit(1);
  }
}

