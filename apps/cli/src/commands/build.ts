import chalk from 'chalk';
import ora from 'ora';
import { detectFramework, runBuild, getBuildCommand } from '@br/frameworks';

interface BuildOptions {
  framework?: string;
  cmd?: string;
  output?: string;
  skipInstall?: boolean;
}

/**
 * Run local build for a project directory
 */
export async function buildCommand(dir: string = '.', options: BuildOptions) {
  const spinner = ora('Analyzing project...').start();

  try {
    // Detect framework
    const detection = await detectFramework(dir);
    spinner.succeed(`Detected framework: ${chalk.cyan(detection.name)} (${detection.confidence} confidence)`);

    // Show build plan
    const buildCmd = options.cmd || (await getBuildCommand(dir, detection.build.cmd));
    const outDir = options.output || detection.build.outDir;

    console.log(chalk.bold('\n📦 Build Plan:\n'));
    console.log(`${chalk.dim('Framework:')}    ${chalk.cyan(detection.name)}`);
    console.log(`${chalk.dim('Build command:')} ${chalk.white(buildCmd || 'none (static)')}`);
    console.log(`${chalk.dim('Output dir:')}    ${chalk.white(outDir)}`);

    if (detection.name === 'static') {
      console.log(chalk.yellow('\n⚠ Static site detected - no build needed\n'));
      return;
    }

    // Run build
    console.log('');
    spinner.start('Building...');

    const result = await runBuild({
      cwd: dir,
      cmd: buildCmd,
      framework: options.framework || detection.name,
      outDir,
      skipInstall: options.skipInstall,
    });

    spinner.succeed('Build completed!');

    // Show summary
    console.log(chalk.bold('\n✨ Build Summary:\n'));
    console.log(`${chalk.dim('Framework:')}  ${chalk.green(result.framework)}`);
    console.log(`${chalk.dim('Output:')}     ${chalk.green(result.outDir)}`);
    
    if (result.timings.install) {
      console.log(`${chalk.dim('Install:')}    ${chalk.cyan(result.timings.install + 'ms')}`);
    }
    
    console.log(`${chalk.dim('Build:')}      ${chalk.cyan(result.timings.build + 'ms')}`);
    console.log(`${chalk.dim('Total:')}      ${chalk.cyan(result.timings.total + 'ms')}`);
    console.log('');

    // Next step hint
    console.log(chalk.dim('→ Run ') + chalk.white('br drop ' + result.outDir) + chalk.dim(' to deploy\n'));

  } catch (error: any) {
    spinner.fail('Build failed');
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}
