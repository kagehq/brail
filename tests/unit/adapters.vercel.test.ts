import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VercelAdapter } from '@br/adapters';

describe('VercelAdapter', () => {
  let adapter: VercelAdapter;

  beforeEach(() => {
    adapter = new VercelAdapter();
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        token: 'vercel_test_token',
        teamId: 'team_123',
        projectName: 'my-project',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should reject config without token', () => {
      const config = {
        teamId: 'team_123',
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
        token: 'vercel_test_token',
      };

      const result = adapter.validateConfig(config);

      expect(result.valid).toBe(true);
    });
  });

  describe('adapter properties', () => {
    it('should have correct name', () => {
      expect(adapter.name).toBe('vercel');
    });
  });
});

