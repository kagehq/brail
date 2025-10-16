import { createHash } from 'crypto';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

/**
 * Compute SHA-256 hash of the lockfile
 */
export async function lockfileHash(cwd: string): Promise<string | null> {
  const lockfiles = [
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
  ];

  for (const file of lockfiles) {
    const path = join(cwd, file);
    
    try {
      await access(path);
      const content = await readFile(path, 'utf-8');
      return createHash('sha256').update(content).digest('hex');
    } catch {
      // Try next lockfile
      continue;
    }
  }

  return null;
}

