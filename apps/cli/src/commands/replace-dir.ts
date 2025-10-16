import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import * as tus from 'tus-js-client';
import { requireConfig } from '../config.js';

interface ReplaceDirOptions {
  site?: string;
  dest?: string;
  yes?: boolean;
  noDelete?: boolean;
  ignore?: string;
}

interface FileEntry {
  path: string;
  size: number;
}

export async function replaceDirCommand(localDir: string, options: ReplaceDirOptions) {
  console.log(chalk.bold('\n📁 Brail Path Patch - Replace Directory\n'));
  
  // Load config
  const config = await requireConfig();
  
  // Get site ID
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
  
  // Get destination directory
  let destDir = options.dest || '/';
  
  if (!options.dest) {
    const answer = await prompts({
      type: 'text',
      name: 'destDir',
      message: 'Destination directory (e.g., /images/):',
      initial: '/',
    });
    
    if (answer.destDir !== undefined) {
      destDir = answer.destDir;
    }
  }
  
  // Ensure trailing slash for directories
  if (!destDir.endsWith('/')) {
    destDir += '/';
  }
  
  const spinner = ora('Scanning local directory...').start();
  
  // Collect local files
  let localFiles: FileEntry[] = [];
  try {
    localFiles = await collectFiles(localDir, options.ignore);
    spinner.succeed(`Found ${chalk.bold(localFiles.length)} local file(s)`);
  } catch (error: any) {
    spinner.fail(`Failed to scan directory: ${error.message}`);
    process.exit(1);
  }
  
  // Get current file tree from site
  spinner.start('Fetching deployed files...');
  
  let deployedFiles: FileEntry[] = [];
  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/tree`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const tree: any = await response.json();
    deployedFiles = (tree.files || [])
      .filter((f: any) => f.path.startsWith(destDir))
      .map((f: any) => ({
        path: f.path.substring(destDir.length),
        size: f.size,
      }));
    
    spinner.succeed(`Found ${chalk.bold(deployedFiles.length)} deployed file(s) in ${destDir}`);
  } catch (error: any) {
    spinner.fail(`Failed to fetch deployed files: ${error.message}`);
    process.exit(1);
  }
  
  // Compare and determine actions
  const localPaths = new Set(localFiles.map(f => f.path));
  const deployedPaths = new Set(deployedFiles.map(f => f.path));
  
  const filesToUpload = localFiles.filter(f => {
    const deployed = deployedFiles.find(d => d.path === f.path);
    // Upload if new or size changed (simple heuristic)
    return !deployed || deployed.size !== f.size;
  });
  
  const filesToDelete = options.noDelete
    ? []
    : deployedFiles
        .filter(f => !localPaths.has(f.path))
        .map(f => destDir + f.path);
  
  // Show summary
  console.log(chalk.dim('\nChanges:'));
  if (filesToUpload.length > 0) {
    console.log(chalk.green(`  ${filesToUpload.length} file(s) to upload`));
  }
  if (filesToDelete.length > 0) {
    console.log(chalk.yellow(`  ${filesToDelete.length} file(s) to delete`));
  }
  if (filesToUpload.length === 0 && filesToDelete.length === 0) {
    console.log(chalk.dim('  No changes detected'));
    process.exit(0);
  }
  console.log();
  
  // Create patch deploy
  spinner.start('Creating patch deploy...');
  
  let deployId: string;
  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result: any = await response.json();
    deployId = result.deployId;
    spinner.succeed(`Created patch deploy ${chalk.dim(deployId)}`);
  } catch (error: any) {
    spinner.fail(`Failed to create deploy: ${error.message}`);
    process.exit(1);
  }
  
  // Upload changed files
  if (filesToUpload.length > 0) {
    console.log(chalk.bold('\n📤 Uploading files...\n'));
    
    let uploadedCount = 0;
    const uploadSpinner = ora().start();
    
    const updateProgress = () => {
      uploadSpinner.text = `${uploadedCount}/${filesToUpload.length} files uploaded`;
    };
    
    updateProgress();
    
    try {
      await uploadFiles(
        localDir,
        filesToUpload,
        deployId,
        destDir,
        config.apiUrl,
        () => {
          uploadedCount++;
          updateProgress();
        }
      );
      
      uploadSpinner.succeed(`Uploaded ${chalk.bold(filesToUpload.length)} file(s)`);
    } catch (error: any) {
      uploadSpinner.fail(`Upload failed: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Upload manifest with deletions if needed
  if (filesToDelete.length > 0) {
    spinner.start('Uploading manifest with deletions...');
    
    try {
      // Get the base deploy to reference in manifest
      const siteResponse = await fetch(`${config.apiUrl}/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
        },
      });
      
      if (!siteResponse.ok) {
        throw new Error(`Failed to fetch site: HTTP ${siteResponse.status}`);
      }
      
      const site: any = await siteResponse.json();
      const baseDeployId = site.activeDeployId;
      
      if (!baseDeployId) {
        throw new Error('Site has no active deployment');
      }
      
      // Create manifest
      const manifest = {
        baseDeployId,
        overrides: [], // Will be computed during finalize
        deletes: filesToDelete,
      };
      
      // Upload manifest as a file
      const manifestContent = JSON.stringify(manifest);
      const manifestBlob = new Blob([manifestContent], { type: 'application/json' });
      
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(manifestBlob, {
          endpoint: `${config.apiUrl}/v1/uploads`,
          retryDelays: [0, 1000, 3000],
          metadata: {
            filename: 'manifest.json',
          },
          headers: {
            'x-deploy-id': deployId,
            'x-relpath': 'manifest.json',
          },
          onError: reject,
          onSuccess: () => resolve(),
        });
        
        upload.start();
      });
      
      spinner.succeed(`Uploaded manifest with ${filesToDelete.length} deletion(s)`);
    } catch (error: any) {
      spinner.fail(`Failed to upload manifest: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Finalize
  spinner.start('Finalizing patch...');
  
  try {
    const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/deploy/${deployId}/finalize`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    spinner.succeed('Finalized patch');
  } catch (error: any) {
    spinner.fail(`Failed to finalize: ${error.message}`);
    process.exit(1);
  }
  
  console.log(chalk.green(`\n✓ Directory patch complete`));
  console.log(chalk.dim(`  Deploy: ${deployId}`));
  
  // Ask to activate
  let shouldActivate = options.yes || false;
  
  if (!shouldActivate) {
    const answer = await prompts({
      type: 'confirm',
      name: 'activate',
      message: 'Activate this patch now?',
      initial: true,
    });
    
    shouldActivate = answer.activate;
  }
  
  if (shouldActivate) {
    spinner.start('Activating patch...');
    
    try {
      const response = await fetch(`${config.apiUrl}/v1/sites/${siteId}/patch/deploy/${deployId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      spinner.succeed('Patch activated');
      console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(`${config.apiUrl.replace('/v1', '')}/public/${siteId}/`)}\n`));
    } catch (error: any) {
      spinner.fail(`Failed to activate: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(chalk.dim('\nActivate later with "br rollback"\n'));
  }
}

async function collectFiles(dir: string, ignorePattern?: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  
  async function scan(currentPath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        await scan(fullPath);
      } else if (entry.isFile()) {
        // Skip hidden files
        if (entry.name.startsWith('.')) {
          continue;
        }
        
        const stats = await stat(fullPath);
        const relativePath = relative(dir, fullPath).replace(/\\/g, '/');
        
        // TODO: Apply ignore patterns if provided
        
        files.push({
          path: relativePath,
          size: stats.size,
        });
      }
    }
  }
  
  await scan(dir);
  return files;
}

async function uploadFiles(
  baseDir: string,
  files: FileEntry[],
  deployId: string,
  destDir: string,
  apiUrl: string,
  onFileComplete: () => void,
): Promise<void> {
  const uploadEndpoint = `${apiUrl}/v1/uploads`;
  
  // Upload files in parallel (max 5 at a time)
  const maxConcurrent = 5;
  const queue = [...files];
  const active: Promise<void>[] = [];
  
  while (queue.length > 0 || active.length > 0) {
    while (active.length < maxConcurrent && queue.length > 0) {
      const file = queue.shift()!;
      const fullPath = join(baseDir, file.path);
      const remotePath = destDir + file.path;
      
      const promise = uploadFile(fullPath, remotePath, deployId, uploadEndpoint, onFileComplete)
        .finally(() => {
          const index = active.indexOf(promise);
          if (index > -1) {
            active.splice(index, 1);
          }
        });
      
      active.push(promise);
    }
    
    if (active.length > 0) {
      await Promise.race(active);
    }
  }
}

async function uploadFile(
  fullPath: string,
  remotePath: string,
  deployId: string,
  uploadEndpoint: string,
  onComplete: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const fileStream = fs.createReadStream(fullPath);
    
    const upload = new tus.Upload(fileStream, {
      endpoint: uploadEndpoint,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        filename: remotePath,
      },
      headers: {
        'x-deploy-id': deployId,
        'x-relpath': remotePath,
      },
      onError: (error) => {
        reject(error);
      },
      onSuccess: () => {
        onComplete();
        resolve();
      },
    });
    
    upload.start();
  });
}

