/**
 * Cache Version Validation Tests
 *
 * Covers version match/mismatch, missing cache, missing session, and fetch-failure paths.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before imports
vi.mock('@infra/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./queryClient', () => ({
  queryClient: {
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
  },
}));

vi.mock('@domains/storage', () => ({
  StorageService: {
    getConfigVersion: vi.fn(),
  },
}));

import { StorageService } from '@domains/storage';
import { logger } from '@infra/logger';

import { validateCacheVersion } from './cacheVersionValidation';
import { queryClient } from './queryClient';

const mockLocalStorage = {
  removeItem: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const getConfigVersion = vi.mocked(StorageService.getConfigVersion);

describe('validateCacheVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no access token provided', () => {
    it('should return valid with no-session reason', async () => {
      const result = await validateCacheVersion(null, 'lab_test');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: null,
        reason: 'no-session',
      });
      expect(getConfigVersion).not.toHaveBeenCalled();
    });
  });

  describe('when no cached data exists', () => {
    it('should return valid with no-cache reason', async () => {
      vi.mocked(queryClient.getQueryData).mockReturnValue(undefined);

      const result = await validateCacheVersion('valid-token', 'lab_test');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: null,
        reason: 'no-cache',
      });
      expect(getConfigVersion).not.toHaveBeenCalled();
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
      getConfigVersion.mockResolvedValue(5);

      const result = await validateCacheVersion('valid-token', 'lab_test');

      expect(result).toEqual({
        isValid: true,
        serverVersion: 5,
        cachedVersion: 5,
        reason: 'match',
      });
      expect(queryClient.removeQueries).not.toHaveBeenCalled();
    });

    it('should clear cache when server version is higher', async () => {
      getConfigVersion.mockResolvedValue(10);

      const result = await validateCacheVersion('valid-token', 'lab_test');

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
      getConfigVersion.mockResolvedValue(1);

      const result = await validateCacheVersion('valid-token', 'lab_test');

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

    it('should not clear cache when the version request fails', async () => {
      getConfigVersion.mockRejectedValue(new Error('Network error'));

      const result = await validateCacheVersion('valid-token', 'lab_test');

      expect(result).toEqual({
        isValid: true,
        serverVersion: null,
        cachedVersion: 5,
        reason: 'error',
      });
      expect(queryClient.removeQueries).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Could not verify cache version - server unreachable',
        {
          error: expect.any(Error),
        }
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

      const result = await validateCacheVersion('valid-token', 'lab_test');

      expect(result.reason).toBe('no-cache');
    });
  });
});
