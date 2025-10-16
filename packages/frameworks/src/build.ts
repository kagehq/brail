import { execa } from 'execa';
import { join } from 'path';
import { detectFramework, getBuildCommand, detectPackageManager, type FrameworkDetection } from './detect.js';
import { validateBuildOutput, type ValidationWarning } from './validate.js';

export interface BuildOptions {
  cwd: string;
  cmd?: string;
  framework?: string;
  outDir?: string;
  cacheKey?: string;
  skipInstall?: boolean;
  validate?: boolean; // Default true
}

export interface BuildResult {
  outDir: string;
  framework: string;
  timings: {
    install?: number;
    build: number;
    total: number;
  };
  stdout?: string;
  stderr?: string;
  exitCode: number;
  warnings: ValidationWarning[];
}

/**
 * Run the build pipeline for a project
 */
export async function runBuild(options: BuildOptions): Promise<BuildResult> {
  const { cwd, cmd, framework: frameworkHint, outDir: outDirHint, skipInstall = false, validate = true } = options;
  
  const startTime = Date.now();
  const timings: BuildResult['timings'] = { build: 0, total: 0 };
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let warnings: ValidationWarning[] = [];

  // Detect framework if not provided
  let detection: FrameworkDetection;
  if (frameworkHint) {
    // Use hint but still detect for build command
    detection = await detectFramework(cwd);
    detection.name = frameworkHint as any;
  } else {
    detection = await detectFramework(cwd);
  }

  const framework = detection.name;
  console.log(`✓ Detected framework: ${framework}`);

  // Determine output directory
  const outDir = outDirHint || detection.build.outDir;

  // Skip install for static sites or if requested
  if (!skipInstall && framework !== 'static') {
    const installStart = Date.now();
    await runInstall(cwd);
    timings.install = Date.now() - installStart;
    console.log(`✓ Dependencies installed (${timings.install}ms)`);
  }

  // Run build command
  if (framework !== 'static') {
    const buildCmd = cmd || (await getBuildCommand(cwd, detection.build.cmd));
    const buildStart = Date.now();
    
    console.log(`→ Running: ${buildCmd}`);
    const result = await runCommandWithCapture(buildCmd, cwd);
    stdout = result.stdout;
    stderr = result.stderr;
    exitCode = result.exitCode;
    
    timings.build = Date.now() - buildStart;
    console.log(`✓ Build completed (${timings.build}ms)`);
  }

  timings.total = Date.now() - startTime;

  // Validate build output
  if (validate && exitCode === 0) {
    const outputPath = join(cwd, outDir);
    const validationResult = await validateBuildOutput(cwd, outputPath, framework as any);
    warnings = validationResult.warnings;
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  Validation warnings:`);
      warnings.forEach(w => {
        const icon = w.level === 'error' ? '✗' : '⚠';
        console.log(`  ${icon} ${w.message}`);
        if (w.suggestion) {
          console.log(`     → ${w.suggestion}`);
        }
      });
      console.log('');
    }
  }

  return {
    outDir: join(cwd, outDir),
    framework,
    timings,
    stdout,
    stderr,
    exitCode,
    warnings,
  };
}

/**
 * Install dependencies with the appropriate package manager
 */
async function runInstall(cwd: string): Promise<void> {
  const pm = await detectPackageManager(cwd);
  
  const installCmd = {
    npm: 'npm ci',
    pnpm: 'pnpm install --frozen-lockfile',
    yarn: 'yarn install --frozen-lockfile',
  }[pm];

  await runCommand(installCmd, cwd);
}

/**
 * Run a shell command
 */
async function runCommand(cmd: string, cwd: string): Promise<void> {
  const [command, ...args] = cmd.split(' ');
  
  await execa(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
}

/**
 * Run a shell command and capture output
 */
async function runCommandWithCapture(
  cmd: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const [command, ...args] = cmd.split(' ');
  
  try {
    const result = await execa(command, args, {
      cwd,
      shell: true,
      all: true, // Combine stdout and stderr
    });
    
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode || 0,
    };
  } catch (error: any) {
    // Execa throws on non-zero exit codes
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.exitCode || 1,
    };
  }
}

