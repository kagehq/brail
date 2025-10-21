#!/usr/bin/env node

import { readFileSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fix CLI shebang
const cliPath = join(__dirname, '../apps/cli/dist/index.js');
try {
  let content = readFileSync(cliPath, 'utf8');
  
  // Add shebang if not present
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    writeFileSync(cliPath, content);
  }
  
  // Make executable
  chmodSync(cliPath, 0o755);
  
  console.log('✓ CLI shebang fixed and made executable');
} catch (error) {
  console.error('Error fixing CLI shebang:', error.message);
  process.exit(1);
}

