import { describe, it, expect } from 'vitest';
import { toVercelConfig, toCloudflareFiles } from '@br/shared';

describe('dropjson-to-platform mappers', () => {
  describe('toVercelConfig', () => {
    it('should map redirects to Vercel format', () => {
      const dropConfig = {
        redirects: [
          {
            source: '/old-page',
            destination: '/new-page',
            statusCode: 301,
          },
          {
            source: '/temp',
            destination: '/permanent',
            statusCode: 302,
          },
        ],
      };

      const vercelConfig = toVercelConfig(dropConfig);

      expect(vercelConfig.redirects).toBeDefined();
      expect(vercelConfig.redirects).toHaveLength(2);
      expect(vercelConfig.redirects[0]).toMatchObject({
        source: '/old-page',
        destination: '/new-page',
        statusCode: 301,
        permanent: true,
      });
      expect(vercelConfig.redirects[1]).toMatchObject({
        source: '/temp',
        destination: '/permanent',
        statusCode: 302,
        permanent: false,
      });
    });

    it('should map headers to Vercel format', () => {
      const dropConfig = {
        headers: [
          {
            source: '/(.*)',
            headers: [
              {
                key: 'X-Frame-Options',
                value: 'DENY',
              },
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
              },
            ],
          },
        ],
      };

      const vercelConfig = toVercelConfig(dropConfig);

      expect(vercelConfig.headers).toBeDefined();
      expect(vercelConfig.headers).toHaveLength(1);
      expect(vercelConfig.headers[0]).toMatchObject({
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      });
    });

    it('should return empty object for null config', () => {
      const vercelConfig = toVercelConfig(null);
      expect(vercelConfig).toEqual({});
    });

    it('should handle both redirects and headers', () => {
      const dropConfig = {
        redirects: [
          {
            source: '/old',
            destination: '/new',
            statusCode: 301,
          },
        ],
        headers: [
          {
            source: '/*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000',
              },
            ],
          },
        ],
      };

      const vercelConfig = toVercelConfig(dropConfig);

      expect(vercelConfig.redirects).toBeDefined();
      expect(vercelConfig.headers).toBeDefined();
      expect(vercelConfig.redirects).toHaveLength(1);
      expect(vercelConfig.headers).toHaveLength(1);
    });
  });

  describe('toCloudflareFiles', () => {
    it('should generate _redirects file content', () => {
      const dropConfig = {
        redirects: [
          {
            source: '/old-page',
            destination: '/new-page',
            statusCode: 301,
          },
          {
            source: '/temp',
            destination: '/permanent',
            statusCode: 302,
          },
        ],
      };

      const cfFiles = toCloudflareFiles(dropConfig);

      expect(cfFiles._redirects).toBeDefined();
      expect(cfFiles._redirects).toContain('/old-page /new-page 301');
      expect(cfFiles._redirects).toContain('/temp /permanent 302');
    });

    it('should generate _headers file content', () => {
      const dropConfig = {
        headers: [
          {
            source: '/(.*)',
            headers: [
              {
                key: 'X-Frame-Options',
                value: 'DENY',
              },
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
              },
            ],
          },
        ],
      };

      const cfFiles = toCloudflareFiles(dropConfig);

      expect(cfFiles._headers).toBeDefined();
      expect(cfFiles._headers).toContain('/(.*)\n');
      expect(cfFiles._headers).toContain('  X-Frame-Options: DENY');
      expect(cfFiles._headers).toContain('  X-Content-Type-Options: nosniff');
    });

    it('should return empty object for null config', () => {
      const cfFiles = toCloudflareFiles(null);
      expect(cfFiles).toEqual({});
    });

    it('should handle both redirects and headers', () => {
      const dropConfig = {
        redirects: [
          {
            source: '/old',
            destination: '/new',
            statusCode: 301,
          },
        ],
        headers: [
          {
            source: '/*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000',
              },
            ],
          },
        ],
      };

      const cfFiles = toCloudflareFiles(dropConfig);

      expect(cfFiles._redirects).toBeDefined();
      expect(cfFiles._headers).toBeDefined();
      expect(cfFiles._redirects).toContain('/old /new 301');
      expect(cfFiles._headers).toContain('/*\n');
      expect(cfFiles._headers).toContain('  Cache-Control: public, max-age=31536000');
    });

    it('should use 301 as default status code', () => {
      const dropConfig = {
        redirects: [
          {
            source: '/default',
            destination: '/target',
          },
        ],
      };

      const cfFiles = toCloudflareFiles(dropConfig);

      expect(cfFiles._redirects).toContain('/default /target 301');
    });
  });
});

