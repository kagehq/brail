#!/usr/bin/env node

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import prompts from 'prompts';
import chalk from 'chalk';

console.log(chalk.bold.blue('\n📦 Create Brail Adapter\n'));

// Prompt for adapter details
const answers = await prompts([
  {
    type: 'text',
    name: 'name',
    message: 'Adapter name (without "br-adapter-" prefix):',
    validate: (value) => /^[a-z0-9-]+$/.test(value) || 'Name must be lowercase alphanumeric with dashes',
  },
  {
    type: 'text',
    name: 'displayName',
    message: 'Display name:',
    initial: (prev) => prev.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  },
  {
    type: 'text',
    name: 'description',
    message: 'Description:',
    initial: (prev, values) => `Deploy to ${values.displayName}`,
  },
]);

if (!answers.name) {
  console.log(chalk.red('\n✗ Cancelled\n'));
  process.exit(1);
}

const packageName = `br-adapter-${answers.name}`;
const targetDir = join(process.cwd(), packageName);

console.log(chalk.dim(`\nCreating adapter in ${targetDir}...\n`));

try {
  // Create directory structure
  await mkdir(targetDir, { recursive: true });
  await mkdir(join(targetDir, 'src'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: packageName,
    version: '0.1.0',
    description: answers.description,
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      clean: 'rm -rf dist',
    },
    keywords: ['brail', 'adapter', 'deployment', answers.name],
    author: '',
    license: 'MIT',
    peerDependencies: {
      '@br/adapter-kit': '^0.1.0',
    },
    devDependencies: {
      '@br/adapter-kit': '^0.1.0',
      '@types/node': '^20.10.0',
      'typescript': '^5.3.3',
    },
  };

  await writeFile(
    join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'node',
      declaration: true,
      declarationMap: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  await writeFile(
    join(targetDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2),
  );

  // Create src/index.ts
  const adapterCode = `import { defineAdapter, validateRequired, type AdapterContext, type UploadInput, type ActivateInput, type RollbackInput } from '@br/adapter-kit';

/**
 * ${answers.displayName} Adapter
 * 
 * Deploy static sites to ${answers.displayName}.
 */
export default defineAdapter(() => ({
  name: '${answers.name}',

  validateConfig(config: unknown) {
    return validateRequired(config, [
      { name: 'apiKey', type: 'string' },
      // Add your required config fields here
    ]);
  },

  async upload(ctx: AdapterContext, input: UploadInput) {
    const { deployId, filesDir, config, site } = input;
    
    ctx.logger.info(\`[${answers.displayName}] Starting upload for deploy \${deployId}\`);

    // TODO: Implement your upload logic here
    // Example:
    // 1. Read files from filesDir
    // 2. Upload to ${answers.displayName} API
    // 3. Return destination reference and preview URL

    return {
      destinationRef: \`${answers.name}://\${site.id}/\${deployId}\`,
      platformDeploymentId: deployId,
      previewUrl: \`https://\${site.name}.${answers.name}.example.com\`,
    };
  },

  async activate(ctx: AdapterContext, input: ActivateInput) {
    const { deployId, config, site, target } = input;
    
    ctx.logger.info(\`[${answers.displayName}] Activating deploy \${deployId} to \${target}\`);

    // TODO: Implement your activation logic here
    // Example:
    // 1. Mark deployment as active in ${answers.displayName}
    // 2. Update DNS/routing if needed
    // 3. Perform health checks

    ctx.logger.info(\`[${answers.displayName}] Deploy activated successfully\`);
  },

  async rollback(ctx: AdapterContext, input: RollbackInput) {
    const { toDeployId, config, site } = input;
    
    ctx.logger.info(\`[${answers.displayName}] Rolling back to deploy \${toDeployId}\`);

    // TODO: Implement your rollback logic here
    // Example:
    // 1. Switch active deployment to toDeployId
    // 2. Update routing
    // 3. Verify rollback success

    ctx.logger.info(\`[${answers.displayName}] Rollback complete\`);
  },
}));
`;

  await writeFile(join(targetDir, 'src', 'index.ts'), adapterCode);

  // Create README.md
  const readme = `# ${packageName}

${answers.description}

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Configuration

\`\`\`json
{
  "adapter": "${answers.name}",
  "config": {
    "apiKey": "your-api-key"
  }
}
\`\`\`

## Usage

This adapter is designed to work with Brail. Add it to your connection profiles:

\`\`\`bash
# Via Brail CLI
br profile add ${answers.name} --adapter ${answers.name}
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
\`\`\`

## License

MIT
`;

  await writeFile(join(targetDir, 'README.md'), readme);

  // Create .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;

  await writeFile(join(targetDir, '.gitignore'), gitignore);

  console.log(chalk.green('✓ Adapter scaffolded successfully!\n'));
  console.log(chalk.bold('📁 Created files:\n'));
  console.log(chalk.dim('  - package.json'));
  console.log(chalk.dim('  - tsconfig.json'));
  console.log(chalk.dim('  - src/index.ts'));
  console.log(chalk.dim('  - README.md'));
  console.log(chalk.dim('  - .gitignore\n'));

  console.log(chalk.bold('🚀 Next steps:\n'));
  console.log(chalk.white(`  cd ${packageName}`));
  console.log(chalk.white('  npm install'));
  console.log(chalk.white('  npm run dev\n'));

  console.log(chalk.dim('  Then implement your adapter logic in src/index.ts\n'));

} catch (error) {
  console.error(chalk.red(`\n✗ Failed to create adapter: ${error.message}\n`));
  process.exit(1);
}

