import { readdir, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import * as tus from 'tus-js-client';
import { ApiClient, formatBytes, formatDuration } from '@br/shared';
import { detectFramework, runBuild } from '@br/frameworks';
import { requireConfig } from '../config.js';

interface DropOptions {
  site?: string;
  yes?: boolean;
  adapter?: string;
  profile?: string;
  target?: 'preview' | 'production';
  build?: 'auto' | string;
  framework?: string;
  output?: string;
  skipBuild?: boolean;
}

export async function dropCommand(dir: string, options: DropOptions) {
  console.log(chalk.bold('\n📦 Deploying to Brail\n'));
  
  // Load config
  const config = await requireConfig();
  const api = new ApiClient({
    baseUrl: config.apiUrl,
    token: config.token,
  });
  
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
  
  const startTime = Date.now();
  let deployDir = dir;
  let buildResult: any = null;

  // Run build if requested (unless explicitly skipped)
  if (!options.skipBuild && (options.build || options.build === 'auto')) {
    const spinner = ora('Detecting framework...').start();

    try {
      const detection = await detectFramework(dir);
      spinner.succeed(`Detected: ${chalk.cyan(detection.name)}`);

      if (detection.name !== 'static') {
        spinner.start('Building project...');

        const result = await runBuild({
          cwd: dir,
          cmd: options.build && options.build !== 'auto' ? options.build : undefined,
          framework: options.framework || detection.name,
          outDir: options.output,
        });

        buildResult = result; // Store for logging later
        
        spinner.succeed(`Build completed in ${chalk.cyan(result.timings.total + 'ms')}`);
        
        // Use build output directory for deployment
        deployDir = result.outDir;
        console.log(chalk.dim(`→ Deploying from: ${deployDir}\n`));
      }
    } catch (error: any) {
      spinner.fail('Build failed');
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  }
  
  // Collect files
  const spinner = ora('Scanning directory...').start();
  
  let files: Array<{ path: string; size: number }> = [];
  
  try {
    files = await collectFiles(deployDir);
    spinner.succeed(
      `Found ${chalk.bold(files.length)} files (${chalk.bold(formatBytes(files.reduce((sum, f) => sum + f.size, 0)))})`,
    );
  } catch (error) {
    spinner.fail(`Failed to scan directory: ${error}`);
    process.exit(1);
  }
  
  // Create deploy
  spinner.start('Creating deployment...');
  
  let deployId: string;
  
  try {
    const deploy = await api.createDeploy(siteId!);
    deployId = deploy.deployId;
    spinner.succeed(`Created deployment ${chalk.dim(deployId)}`);
  } catch (error: any) {
    spinner.fail(`Failed to create deployment: ${error.message}`);
    process.exit(1);
  }
  
  // Upload files
  console.log(chalk.bold('\n📤 Uploading files...\n'));
  
  let uploadedCount = 0;
  let uploadedBytes = 0;
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  
  const uploadSpinner = ora().start();
  
  const updateProgress = () => {
    const progress = (uploadedBytes / totalBytes) * 100;
    uploadSpinner.text = `${uploadedCount}/${files.length} files (${formatBytes(uploadedBytes)}/${formatBytes(totalBytes)}) ${progress.toFixed(1)}%`;
  };
  
  updateProgress();
  
  try {
    await uploadFiles(deployDir, files, deployId, config.apiUrl, (file, bytesUploaded) => {
      if (bytesUploaded === file.size) {
        uploadedCount++;
      }
      uploadedBytes += bytesUploaded;
      updateProgress();
    });
    
    uploadSpinner.succeed(
      `Uploaded ${chalk.bold(uploadedCount)} files (${chalk.bold(formatBytes(totalBytes))})`,
    );
  } catch (error: any) {
    uploadSpinner.fail(`Upload failed: ${error.message}`);
    process.exit(1);
  }
  
  // Finalize
  spinner.start('Finalizing deployment...');
  
  try {
    await api.finalizeDeploy(deployId);
    spinner.succeed('Finalized deployment');
  } catch (error: any) {
    spinner.fail(`Failed to finalize: ${error.message}`);
    process.exit(1);
  }
  
  // Send build log if we built
  if (buildResult) {
    try {
      await api.createBuildLog({
        siteId: siteId!,
        deployId,
        framework: buildResult.framework,
        command: options.build && options.build !== 'auto' ? options.build : `npm run build`,
        status: buildResult.exitCode === 0 ? 'success' : 'failed',
        exitCode: buildResult.exitCode,
        stdout: buildResult.stdout,
        stderr: buildResult.stderr,
        duration: buildResult.timings.total,
        warnings: buildResult.warnings,
        nodeVersion: process.version,
        outputDir: buildResult.outDir,
      });
    } catch (error: any) {
      // Don't fail the deployment if build log fails
      console.log(chalk.dim(`\n⚠️  Build log not saved: ${error.message}\n`));
    }
  }
  
  const elapsed = Date.now() - startTime;
  
  console.log(chalk.green(`\n✓ Deploy complete in ${formatDuration(elapsed)}\n`));
  
  // If adapter or profile specified, stage to destination
  if (options.adapter || options.profile) {
    await stageAndActivateWithAdapter(
      config,
      siteId!,
      deployId,
      options,
      spinner,
    );
  } else {
    // Legacy Phase-0 activation
    let shouldActivate = options.yes || false;
    
    if (!shouldActivate) {
      const answer = await prompts({
        type: 'confirm',
        name: 'activate',
        message: 'Activate this deployment now?',
        initial: true,
      });
      
      shouldActivate = answer.activate;
    }
    
    if (shouldActivate) {
      spinner.start('Activating deployment...');
      
      try {
        const result = await api.activateDeploy(deployId);
        spinner.succeed('Deployment activated');
        console.log(chalk.bold(`\n🌐 Live at: ${chalk.cyan(result.publicUrl)}\n`));
      } catch (error: any) {
        spinner.fail(`Failed to activate: ${error.message}`);
        process.exit(1);
      }
    } else {
      console.log(chalk.dim(`\nRun "br drop" again or activate from the web UI\n`));
    }
  }
}

/**
 * Stage and activate deployment with adapter
 */
async function stageAndActivateWithAdapter(
  config: any,
  siteId: string,
  deployId: string,
  options: DropOptions,
  spinner: any,
) {
  // Stage to adapter
  const target = options.target || 'preview';
  spinner.start(`Staging to destination (${target})...`);
  
  try {
    const stageBody: any = {
      target,
    };
    
    if (options.profile) {
      stageBody.profileId = options.profile;
    } else if (options.adapter) {
      stageBody.adapter = options.adapter;
      // For now, require profile for adapter configs
      spinner.fail('Inline adapter config not yet supported. Use --profile instead.');
      process.exit(1);
    }
    
    const stageResponse = await fetch(
      `${config.apiUrl}/v1/deploys/${deployId}/stage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(stageBody),
      },
    );
    
    if (!stageResponse.ok) {
      const error: any = await stageResponse.json().catch(() => ({
        message: stageResponse.statusText,
      }));
      throw new Error(error.message || `HTTP ${stageResponse.status}`);
    }
    
    const release: any = await stageResponse.json();
    spinner.succeed(`Staged to destination: ${chalk.dim(release.destinationRef || release.adapter)}`);
    
    // Show preview URL if available
    if (release.previewUrl) {
      console.log(chalk.bold(`\n🔗 Preview URL: ${chalk.cyan(release.previewUrl)}\n`));
    }
  } catch (error: any) {
    spinner.fail(`Failed to stage: ${error.message}`);
    process.exit(1);
  }
  
  // Activate?
  let shouldActivate = options.yes || false;
  
  if (!shouldActivate) {
    const answer = await prompts({
      type: 'confirm',
      name: 'activate',
      message: 'Activate this deployment now?',
      initial: true,
    });
    
    shouldActivate = answer.activate;
  }
  
  if (shouldActivate) {
    spinner.start('Activating deployment...');
    
    try {
      const activateBody: any = {
        target: options.target || 'preview',
      };
      
      if (options.profile) {
        activateBody.profileId = options.profile;
      }
      
      const activateResponse = await fetch(
        `${config.apiUrl}/v1/deploys/${deployId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`,
          },
          body: JSON.stringify(activateBody),
        },
      );
      
      if (!activateResponse.ok) {
        const error: any = await activateResponse.json().catch(() => ({
          message: activateResponse.statusText,
        }));
        throw new Error(error.message || `HTTP ${activateResponse.status}`);
      }
      
      const result = await activateResponse.json();
      spinner.succeed('Deployment activated');
      console.log(chalk.bold(`\n✓ Deployment activated successfully\n`));
    } catch (error: any) {
      spinner.fail(`Failed to activate: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(chalk.dim(`\nRun "br rollback" or activate from the web UI\n`));
  }
}

async function collectFiles(dir: string): Promise<Array<{ path: string; size: number }>> {
  const files: Array<{ path: string; size: number }> = [];
  
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
  files: Array<{ path: string; size: number }>,
  deployId: string,
  apiUrl: string,
  onProgress: (file: { path: string; size: number }, bytesUploaded: number) => void,
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
      
      const promise = uploadFile(fullPath, file, deployId, uploadEndpoint, onProgress)
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
  file: { path: string; size: number },
  deployId: string,
  uploadEndpoint: string,
  onProgress: (file: { path: string; size: number }, bytesUploaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Read file
    const fs = require('fs');
    const fileStream = fs.createReadStream(fullPath);
    
    const upload = new tus.Upload(fileStream, {
      endpoint: uploadEndpoint,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        filename: file.path,
      },
      headers: {
        'x-deploy-id': deployId,
        'x-relpath': file.path,
      },
      onError: (error) => {
        reject(error);
      },
      onProgress: (bytesUploaded) => {
        onProgress(file, bytesUploaded);
      },
      onSuccess: () => {
        resolve();
      },
    });
    
    upload.start();
  });
}

