import { watch as fsWatch } from 'fs';
import { readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import chalk from 'chalk';
import { requireConfig } from '../config.js';

interface WatchOptions {
  site?: string;
  root?: string;
  base?: string;
  ignore?: string;
  auto?: boolean;
}

export async function watchCommand(options: WatchOptions) {
  if (!options.site) {
    console.log(chalk.red('Error: --site is required'));
    process.exit(1);
  }
  
  const siteId = options.site;
  const rootDir = options.root || '.';
  const basePath = options.base || '/';
  const autoActivate = options.auto || false;
  
  console.log(chalk.bold('\n👁️  Brail Watch Mode\n'));
  console.log(chalk.dim(`Site:     ${siteId}`));
  console.log(chalk.dim(`Watching: ${rootDir}`));
  console.log(chalk.dim(`Base:     ${basePath}`));
  console.log(chalk.dim(`Auto:     ${autoActivate ? 'Yes' : 'No'}\n`));
  
  // Load config
  const config = await requireConfig();
  
  // Track pending changes
  let pendingChanges = new Map<string, { type: 'change' | 'delete' }>();
  let batchTimeout: NodeJS.Timeout | null = null;
  
  const processBatch = async () => {
    if (pendingChanges.size === 0) return;
    
    const changes = Array.from(pendingChanges.entries());
    pendingChanges.clear();
    
    console.log(chalk.dim(`\n[${new Date().toLocaleTimeString()}] Processing ${changes.length} change(s)...`));
    
    // Group by type
    const changed = changes.filter(([_, c]) => c.type === 'change').map(([path]) => path);
    const deleted = changes.filter(([_, c]) => c.type === 'delete').map(([path]) => path);
    
    try {
      // Process file changes
      if (changed.length > 0) {
        for (const localPath of changed) {
          const fullPath = join(rootDir, localPath);
          const destPath = join(basePath, localPath).replace(/\\/g, '/');
          
          try {
            const content = await readFile(fullPath);
            const contentType = getContentType(destPath);
            
            const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/file`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`,
              },
              body: JSON.stringify({
                destPath,
                contentB64: content.toString('base64'),
                contentType,
                activate: autoActivate,
              }),
            });
            
            if (!response.ok) {
              const error: any = await response.json().catch(() => ({
                message: response.statusText,
              }));
              throw new Error(error.message || `HTTP ${response.status}`);
            }
            
            const result: any = await response.json();
            const size = ((content.length / 1024).toFixed(1));
            
            console.log(
              chalk.green(`✓ ${destPath}`) +
              chalk.dim(` (${size} KB)`) +
              chalk.dim(` → ${result.deployId.slice(0, 8)}`) +
              (autoActivate ? chalk.bold(' → active') : '')
            );
          } catch (error: any) {
            console.log(chalk.red(`✗ ${destPath}: ${error.message}`));
          }
        }
      }
      
      // Process deletions
      if (deleted.length > 0) {
        const destPaths = deleted.map(p => join(basePath, p).replace(/\\/g, '/'));
        
        try {
          const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.token}`,
            },
            body: JSON.stringify({
              paths: destPaths,
              activate: autoActivate,
            }),
          });
          
          if (!response.ok) {
            const error: any = await response.json().catch(() => ({
              message: response.statusText,
            }));
            throw new Error(error.message || `HTTP ${response.status}`);
          }
          
          const result: any = await response.json();
          
          console.log(
            chalk.yellow(`✓ Deleted ${deleted.length} file(s)`) +
            chalk.dim(` → ${result.deployId.slice(0, 8)}`) +
            (autoActivate ? chalk.bold(' → active') : '')
          );
        } catch (error: any) {
          console.log(chalk.red(`✗ Delete failed: ${error.message}`));
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`✗ Batch failed: ${error.message}`));
    }
  };
  
  const scheduleBatch = () => {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(processBatch, 500);
  };
  
  // Watch for changes
  const watcher = fsWatch(rootDir, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;
    
    // Skip hidden files and node_modules
    if (filename.includes('node_modules') || filename.startsWith('.')) {
      return;
    }
    
    const fullPath = join(rootDir, filename);
    
    try {
      // Check if file exists
      const stats = await stat(fullPath);
      
      if (stats.isFile()) {
        pendingChanges.set(filename, { type: 'change' });
        scheduleBatch();
      }
    } catch (error) {
      // File doesn't exist, probably deleted
      pendingChanges.set(filename, { type: 'delete' });
      scheduleBatch();
    }
  });
  
  console.log(chalk.green('✓ Watching for changes... (Ctrl+C to stop)\n'));
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log(chalk.dim('\n\nStopping watch mode...\n'));
    watcher.close();
    process.exit(0);
  });
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
  };
  
  return types[ext || ''] || 'application/octet-stream';
}

