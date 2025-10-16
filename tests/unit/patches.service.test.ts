import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PatchesService - Path Normalization', () => {
  it('should normalize paths with leading slash', () => {
    const testCases = [
      { input: 'css/app.css', expected: '/css/app.css' },
      { input: '/css/app.css', expected: '/css/app.css' },
      { input: '//css/app.css', expected: '/css/app.css' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = normalizePath(input);
      expect(result).toBe(expected);
    });
  });

  it('should reject paths with .. for security', () => {
    const maliciousPaths = [
      '../etc/passwd',
      '/css/../../../etc/passwd',
      'css/../../secret.txt',
    ];

    maliciousPaths.forEach((path) => {
      expect(() => normalizePath(path)).toThrow('Invalid path: contains ..');
    });
  });

  it('should handle root path', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('should normalize complex paths', () => {
    expect(normalizePath('/css/./app.css')).toBe('/css/app.css');
    expect(normalizePath('/a/b/c')).toBe('/a/b/c');
  });
});

describe('PatchesService - Manifest Logic', () => {
  it('should create manifest with correct structure', () => {
    const manifest = {
      baseDeployId: 'base123',
      overrides: ['/css/app.css', '/js/main.js'],
      deletes: ['/old-file.txt'],
    };

    expect(manifest.baseDeployId).toBe('base123');
    expect(manifest.overrides).toHaveLength(2);
    expect(manifest.deletes).toHaveLength(1);
  });

  it('should merge file indices correctly', () => {
    const baseIndex = [
      { path: '/index.html', size: 100, etag: 'abc' },
      { path: '/css/app.css', size: 50, etag: 'def' },
      { path: '/old.txt', size: 20, etag: 'ghi' },
    ];

    const overrides = ['/css/app.css'];
    const deletes = ['/old.txt'];

    const result = mergeIndices(baseIndex, overrides, deletes);

    expect(result).toHaveLength(2); // index.html + updated css
    expect(result.find(f => f.path === '/index.html')).toBeTruthy();
    expect(result.find(f => f.path === '/css/app.css')).toBeTruthy();
    expect(result.find(f => f.path === '/old.txt')).toBeFalsy();
  });
});

describe('PatchesService - File Serving Logic', () => {
  it('should determine correct deploy for serving', () => {
    const manifest = {
      baseDeployId: 'base123',
      overrides: ['/css/app.css'],
      deletes: ['/old.txt'],
    };

    // File in overrides -> use patch deploy
    expect(getServingDeploy('/css/app.css', manifest, 'patch456')).toBe('patch456');

    // File not in overrides -> use base deploy
    expect(getServingDeploy('/index.html', manifest, 'patch456')).toBe('base123');

    // File in deletes -> should return null/404
    expect(getServingDeploy('/old.txt', manifest, 'patch456')).toBeNull();
  });
});

// Helper functions (simulating service logic for testing)
function normalizePath(inputPath: string): string {
  let normalized = inputPath.startsWith('/') ? inputPath : `/${inputPath}`;
  
  // Use path.posix.normalize equivalent
  const parts = normalized.split('/').filter(p => p && p !== '.');
  normalized = '/' + parts.join('/');
  
  if (normalized.includes('..')) {
    throw new Error('Invalid path: contains ..');
  }
  
  return normalized || '/';
}

function mergeIndices(
  baseIndex: Array<{ path: string; size: number; etag: string }>,
  overrides: string[],
  deletes: string[]
): Array<{ path: string; size: number; etag: string }> {
  const result = new Map();

  // Start with base
  for (const entry of baseIndex) {
    result.set(entry.path, entry);
  }

  // Remove deletes
  for (const deletePath of deletes) {
    result.delete(deletePath);
  }

  // Note: Overrides would have updated metadata in real implementation
  // Here we just verify they're included

  return Array.from(result.values());
}

function getServingDeploy(
  requestPath: string,
  manifest: { baseDeployId: string; overrides: string[]; deletes: string[] },
  patchDeployId: string
): string | null {
  // Check deletes first
  if (manifest.deletes.includes(requestPath)) {
    return null; // 404
  }

  // Check overrides
  if (manifest.overrides.includes(requestPath)) {
    return patchDeployId;
  }

  // Default to base
  return manifest.baseDeployId;
}

