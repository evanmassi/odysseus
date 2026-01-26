/**
 * Cache Version Validation Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before imports
vi.mock('@shared/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../queryClient', () => ({
  queryClient: {
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
  },
}));

vi.mock('../queryKeys', () => ({
  queryKeys: {
    storage: {
      all: ['storage'],
      storage: () => ['storage', 'data'],
    },
    tubes: {
      all: ['tubes'],
    },
    researchers: {
      all: ['researchers'],
    },
  },
}));

import { logger } from '@shared/infrastructure/logger';

import { queryClient } from '../queryClient';

import { validateCacheVersion } from './cacheVersionValidation';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  removeItem: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001/api',
    },
  },
});

describe('validateCacheVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when no access token provided', () => {
    it('should return valid with no-session reason', async () => {
      const result = await validateCacheVersion(null);

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: null,
        reason: 'no-session',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('when no cached data exists', () => {
    it('should return valid with no-cache reason', async () => {
      vi.mocked(queryClient.getQueryData).mockReturnValue(undefined);

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: null,
        reason: 'no-cache',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('when cached data exists', () => {
    const cachedConfig = {
      configuration: {
        systemConfig: {
          version: 5,
        },
      },
    };

    beforeEach(() => {
      vi.mocked(queryClient.getQueryData).mockReturnValue(cachedConfig);
    });

    it('should return valid when versions match', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { version: 5 },
          }),
      });

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: true,
        serverVersion: 5,
        cachedVersion: 5,
        reason: 'match',
      });
      expect(queryClient.removeQueries).not.toHaveBeenCalled();
    });

    it('should clear cache when server version is higher', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { version: 10 },
          }),
      });

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: false,
        serverVersion: 10,
        cachedVersion: 5,
        reason: 'mismatch',
      });
      expect(queryClient.removeQueries).toHaveBeenCalledTimes(3);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('odysseus-query-cache');
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache version mismatch detected',
        expect.objectContaining({
          serverVersion: 10,
          cachedVersion: 5,
          isReset: false,
        })
      );
    });

    it('should detect database reset when server version is lower', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { version: 1 },
          }),
      });

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: false,
        serverVersion: 1,
        cachedVersion: 5,
        reason: 'mismatch',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache version mismatch detected',
        expect.objectContaining({
          isReset: true, // Server version < cached version indicates DB reset
        })
      );
    });

    it('should not clear cache on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: 5,
        reason: 'error',
      });
      expect(queryClient.removeQueries).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Could not verify cache version - server unreachable'
      );
    });

    it('should not clear cache on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await validateCacheVersion('valid-token');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: 5,
        reason: 'error',
      });
      expect(queryClient.removeQueries).not.toHaveBeenCalled();
    });

    it('should send correct authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { version: 5 },
          }),
      });

      await validateCacheVersion('my-access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/configuration/version'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-access-token',
          }),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle malformed cached data gracefully', async () => {
      vi.mocked(queryClient.getQueryData).mockReturnValue({
        configuration: {
          // Missing systemConfig
        },
      });

      const result = await validateCacheVersion('valid-token');

      expect(result.reason).toBe('no-cache');
    });

    it('should handle malformed server response', async () => {
      vi.mocked(queryClient.getQueryData).mockReturnValue({
        configuration: { systemConfig: { version: 5 } },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {}, // Missing version
          }),
      });

      const result = await validateCacheVersion('valid-token');

      expect(result.reason).toBe('error');
    });
  });
});
