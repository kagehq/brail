import { readFile, access } from 'fs/promises';
import { join } from 'path';

export interface FrameworkDetection {
  name: 'next' | 'astro' | 'vite' | 'nuxt' | 'sveltekit' | 'tanstack' | 'react' | 'vue' | 'static';
  build: {
    cmd: string;
    outDir: string;
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect the framework used in a project directory
 */
export async function detectFramework(cwd: string): Promise<FrameworkDetection> {
  // Read package.json
  const packageJson = await readPackageJson(cwd);
  
  if (!packageJson) {
    return {
      name: 'static',
      build: { cmd: '', outDir: '.' },
      confidence: 'high',
    };
  }

  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const scripts = packageJson.scripts || {};

  // Next.js detection
  if (deps['next']) {
    const hasExportScript = scripts.export || (await hasNextConfig(cwd));
    return {
      name: 'next',
      build: {
        cmd: hasExportScript ? 'npm run build && npm run export' : 'npm run build',
        outDir: hasExportScript ? 'out' : '.next',
      },
      confidence: 'high',
    };
  }

  // Astro detection
  if (deps['astro'] || (await fileExists(join(cwd, 'astro.config.mjs')))) {
    return {
      name: 'astro',
      build: {
        cmd: 'npm run build',
        outDir: 'dist',
      },
      confidence: 'high',
    };
  }

  // Nuxt detection
  if (deps['nuxt'] || (await fileExists(join(cwd, 'nuxt.config.ts')))) {
    return {
      name: 'nuxt',
      build: {
        cmd: 'npm run generate',
        outDir: '.output/public',
      },
      confidence: 'high',
    };
  }

  // SvelteKit detection
  if (deps['@sveltejs/kit'] || deps['@sveltejs/adapter-static']) {
    return {
      name: 'sveltekit',
      build: {
        cmd: 'npm run build',
        outDir: 'build',
      },
      confidence: 'high',
    };
  }

  // TanStack Start detection
  if (deps['@tanstack/start'] || (await fileExists(join(cwd, 'tanstack-start.config.ts')))) {
    return {
      name: 'tanstack',
      build: {
        cmd: 'npm run build',
        outDir: 'build/client',
      },
      confidence: 'high',
    };
  }

  // Vite detection (React/Vue/Svelte via Vite)
  if (deps['vite'] || (await fileExists(join(cwd, 'vite.config.ts')))) {
    return {
      name: 'vite',
      build: {
        cmd: 'npm run build',
        outDir: 'dist',
      },
      confidence: 'high',
    };
  }

  // React (CRA or similar)
  if (deps['react'] || deps['react-dom']) {
    return {
      name: 'react',
      build: {
        cmd: 'npm run build',
        outDir: 'build',
      },
      confidence: 'medium',
    };
  }

  // Vue CLI
  if (deps['vue'] || deps['@vue/cli-service']) {
    return {
      name: 'vue',
      build: {
        cmd: 'npm run build',
        outDir: 'dist',
      },
      confidence: 'medium',
    };
  }

  // Default to static
  return {
    name: 'static',
    build: { cmd: '', outDir: '.' },
    confidence: 'low',
  };
}

/**
 * Read and parse package.json
 */
async function readPackageJson(cwd: string): Promise<any | null> {
  try {
    const path = join(cwd, 'package.json');
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for Next.js export configuration
 */
async function hasNextConfig(cwd: string): Promise<boolean> {
  const configFiles = [
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ];

  for (const file of configFiles) {
    if (await fileExists(join(cwd, file))) {
      return true;
    }
  }

  return false;
}

/**
 * Get the appropriate build command for a package manager
 */
export async function getBuildCommand(cwd: string, defaultCmd: string): Promise<string> {
  const pm = await detectPackageManager(cwd);
  
  // Replace npm with detected package manager
  return defaultCmd.replace(/^npm /, `${pm} `);
}

/**
 * Detect which package manager is used
 */
export async function detectPackageManager(cwd: string): Promise<'npm' | 'pnpm' | 'yarn'> {
  if (await fileExists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  
  if (await fileExists(join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  
  return 'npm';
}

