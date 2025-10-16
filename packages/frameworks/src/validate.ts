import { readFile, access, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import type { FrameworkDetection } from './detect.js';

type Framework = FrameworkDetection['name'];

export interface ValidationWarning {
  level: 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
}

/**
 * Validate build output for a given framework
 */
export async function validateBuildOutput(
  projectDir: string,
  outputDir: string,
  framework: Framework,
): Promise<ValidationResult> {
  const warnings: ValidationWarning[] = [];

  try {
    // Check if output directory exists
    try {
      await access(outputDir);
    } catch {
      warnings.push({
        level: 'error',
        message: `Build output directory not found: ${outputDir}`,
        suggestion: 'Check if the build command completed successfully',
      });
      return { valid: false, warnings };
    }

    // Framework-specific validations
    switch (framework) {
      case 'next':
        warnings.push(...await validateNextJS(projectDir, outputDir));
        break;
      case 'astro':
        warnings.push(...await validateAstro(outputDir));
        break;
      case 'vite':
      case 'react':
      case 'vue':
        warnings.push(...await validateVite(outputDir));
        break;
      case 'nuxt':
        warnings.push(...await validateNuxt(outputDir));
        break;
      case 'sveltekit':
        warnings.push(...await validateSvelteKit(outputDir));
        break;
      case 'tanstack':
        warnings.push(...await validateTanStack(outputDir));
        break;
      default:
        // For static sites, just check if there are files
        warnings.push(...await validateStatic(outputDir));
    }
  } catch (error: any) {
    warnings.push({
      level: 'error',
      message: `Validation failed: ${error.message}`,
    });
  }

  const hasErrors = warnings.some(w => w.level === 'error');
  return { valid: !hasErrors, warnings };
}

/**
 * Validate Next.js build output
 */
async function validateNextJS(projectDir: string, outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check for next.config.js/mjs/ts
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  let configPath: string | null = null;
  
  for (const file of configFiles) {
    const fullPath = join(projectDir, file);
    try {
      await access(fullPath);
      configPath = fullPath;
      break;
    } catch {
      // File doesn't exist, try next
    }
  }

  if (configPath) {
    try {
      const configContent = await readFile(configPath, 'utf-8');
      
      // Check if output: 'export' is set
      if (!configContent.includes("output: 'export'") && !configContent.includes('output:"export"')) {
        warnings.push({
          level: 'warning',
          message: 'Next.js config missing "output: \'export\'" for static export',
          suggestion: 'Add "output: \'export\'" to next.config.js for static deployment',
        });
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  // Check for SSR routes in .next/server
  const serverDir = join(outputDir, 'server');
  try {
    await access(serverDir);
    const serverFiles = await readdir(serverDir);
    
    if (serverFiles.length > 0) {
      warnings.push({
        level: 'error',
        message: 'Next.js build contains server-side routes',
        suggestion: 'Use "output: \'export\'" in next.config.js for static deployment',
      });
    }
  } catch {
    // No server directory is good for static export
  }

  // Check if 'out' directory exists (static export)
  const outDir = join(resolve(projectDir), 'out');
  try {
    await access(outDir);
    warnings.push({
      level: 'warning',
      message: 'Next.js exported to "out" directory - you may want to deploy that instead',
      suggestion: 'Use "out" directory for deployment if using static export',
    });
  } catch {
    // No 'out' directory
  }

  // Check for essential files
  const staticDir = join(outputDir, 'static');
  try {
    await access(staticDir);
  } catch {
    warnings.push({
      level: 'warning',
      message: 'Next.js build missing /static directory',
    });
  }

  return warnings;
}

/**
 * Validate Astro build output
 */
async function validateAstro(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check for index.html
  try {
    await access(join(outputDir, 'index.html'));
  } catch {
    warnings.push({
      level: 'warning',
      message: 'No index.html found in Astro build output',
    });
  }

  // Check if output is not empty
  const files = await readdir(outputDir);
  if (files.length === 0) {
    warnings.push({
      level: 'error',
      message: 'Astro build output directory is empty',
    });
  }

  return warnings;
}

/**
 * Validate Vite build output (React, Vue, etc.)
 */
async function validateVite(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check for index.html
  try {
    await access(join(outputDir, 'index.html'));
  } catch {
    warnings.push({
      level: 'error',
      message: 'No index.html found in Vite build output',
      suggestion: 'Ensure Vite build completed successfully',
    });
  }

  // Check for assets directory (usually has JS/CSS)
  try {
    await access(join(outputDir, 'assets'));
  } catch {
    warnings.push({
      level: 'warning',
      message: 'No /assets directory found in Vite build output',
    });
  }

  return warnings;
}

/**
 * Validate Nuxt build output
 */
async function validateNuxt(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Nuxt static output should have index.html
  try {
    await access(join(outputDir, 'index.html'));
  } catch {
    warnings.push({
      level: 'warning',
      message: 'No index.html found in Nuxt output - ensure static generation is enabled',
      suggestion: 'Use "nuxi generate" for static sites or check target: "static" in nuxt.config',
    });
  }

  return warnings;
}

/**
 * Validate SvelteKit build output
 */
async function validateSvelteKit(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check for index.html
  try {
    await access(join(outputDir, 'index.html'));
  } catch {
    warnings.push({
      level: 'warning',
      message: 'No index.html found in SvelteKit build output',
      suggestion: 'Ensure @sveltejs/adapter-static is configured',
    });
  }

  return warnings;
}

/**
 * Validate TanStack Start build output
 */
async function validateTanStack(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check for client directory
  try {
    await access(join(outputDir, 'index.html'));
  } catch {
    warnings.push({
      level: 'warning',
      message: 'No index.html found in TanStack Start client output',
    });
  }

  return warnings;
}

/**
 * Validate static site (basic checks)
 */
async function validateStatic(outputDir: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check if directory has files
  const files = await readdir(outputDir);
  if (files.length === 0) {
    warnings.push({
      level: 'error',
      message: 'Build output directory is empty',
    });
  }

  // Check for common entry points
  const hasIndexHTML = files.includes('index.html');
  const hasIndexHTM = files.includes('index.htm');

  if (!hasIndexHTML && !hasIndexHTM) {
    warnings.push({
      level: 'warning',
      message: 'No index.html found in root of output directory',
      suggestion: 'Most static hosts require an index.html file',
    });
  }

  return warnings;
}

/**
 * Check if a directory has any files recursively
 */
async function hasFilesRecursive(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        return true;
      }
      if (entry.isDirectory()) {
        const hasFiles = await hasFilesRecursive(join(dir, entry.name));
        if (hasFiles) return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

