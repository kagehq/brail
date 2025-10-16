import { describe, it, expect, beforeEach } from 'vitest';
import { CloudflarePagesAdapter } from '@br/adapters';

describe('CloudflarePagesAdapter', () => {
  let adapter: CloudflarePagesAdapter;

  beforeEach(() => {
    adapter = new CloudflarePagesAdapter();
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        accountId: 'abc123',
        apiToken: 'cf_token',
        projectName: 'my-project',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should reject config without accountId', () => {
      const config = {
        apiToken: 'cf_token',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('reason');
    });

    it('should reject config without apiToken', () => {
      const config = {
        accountId: 'abc123',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('reason');
    });

    it('should reject non-object config', () => {
      const result = adapter.validateConfig('not an object');

      expect(result.valid).toBe(false);
    });

    it('should accept minimal valid config', () => {
      const config = {
        accountId: 'abc123',
        apiToken: 'cf_token',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(true);
    });
  });

  describe('adapter properties', () => {
    it('should have correct name', () => {
      expect(adapter.name).toBe('cloudflare-pages');
    });
  });
});

