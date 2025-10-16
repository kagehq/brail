import { writeFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

const DROP_JSON_TEMPLATE = {
  headers: [
    {
      path: '/**/*.html',
      set: {
        'cache-control': 'no-store',
      },
    },
  ],
  redirects: [
    {
      from: '/old-path',
      to: '/new-path',
      status: 301,
    },
  ],
};

export async function initCommand() {
  const dropJsonPath = join(process.cwd(), '_drop.json');
  
  try {
    // Check if file already exists
    await access(dropJsonPath);
    console.log(chalk.yellow('\n⚠ _drop.json already exists\n'));
    process.exit(0);
  } catch (error) {
    // File doesn't exist, create it
  }
  
  try {
    await writeFile(
      dropJsonPath,
      JSON.stringify(DROP_JSON_TEMPLATE, null, 2),
    );
    
    console.log(chalk.green('\n✓ Created _drop.json\n'));
    console.log(chalk.dim('Edit this file to configure headers and redirects\n'));
  } catch (error) {
    console.error(chalk.red(`\n✗ Failed to create _drop.json: ${error}\n`));
    process.exit(1);
  }
}

