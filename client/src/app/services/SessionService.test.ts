/**
 * SessionService Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SessionService } from '@app/services/SessionService';

import type { AuthHttpClient } from '@infra/api/AuthHttpClient';
import type { TokenPair, SessionConfig } from '@shared/types/sessionTypes';

// Mock storage matching actual SessionStorage interface
function createMockStorage() {
  return {
    getTokens: vi.fn<[], TokenPair | null>(),
    setTokens: vi.fn<[TokenPair], void>(),
    clearTokens: vi.fn<[], void>(),
  };
}

// Mock HTTP client matching actual AuthHttpClient interface
function createMockHttpClient() {
  return {
    post: vi.fn(),
    get: vi.fn(),
  } as unknown as AuthHttpClient & {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
}

// Test data
const createValidTokenPair = (): TokenPair => ({
  accessToken: 'valid-access-token',
  refreshToken: 'valid-refresh-token',
  accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
  refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  tokenType: 'Bearer',
});

const createExpiredTokenPair = (): TokenPair => ({
  ...createValidTokenPair(),
  accessTokenExpiry: new Date(Date.now() - 60 * 1000), // 1 min ago
});

const createExpiringSoonTokenPair = (): TokenPair => ({
  ...createValidTokenPair(),
  accessTokenExpiry: new Date(Date.now() + 30 * 1000), // 30 seconds from now (< 1 min = invalid)
});

const testConfig: SessionConfig = {
  refreshBufferMinutes: 5,
  maxRetries: 3,
  retryDelayMs: 100, // Fast retries for testing
};

describe('SessionService', () => {
  let sessionManager: SessionService;
  let mockStorage: ReturnType<typeof createMockStorage>;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    mockHttpClient = createMockHttpClient();

    // Default: no existing tokens
    mockStorage.getTokens.mockReturnValue(null);

    sessionManager = new SessionService(
      mockHttpClient as unknown as AuthHttpClient,
      mockStorage,
      undefined,
      testConfig
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionManager.destroy();
  });

  describe('Token Validation', () => {
    it('should validate valid tokens correctly', () => {
      const validation = sessionManager.validateTokens(createValidTokenPair());

      expect(validation.isValid).toBe(true);
      expect(validation.needsRefresh).toBe(false);
      expect(validation.expiresIn).toBeGreaterThan(25 * 60 * 1000);
    });

    it('should detect expired tokens', () => {
      const validation = sessionManager.validateTokens(createExpiredTokenPair());

      expect(validation.isValid).toBe(false);
      expect(validation.needsRefresh).toBe(true);
      expect(validation.expiresIn).toBeLessThan(0);
    });

    it('should detect tokens needing refresh', () => {
      const validation = sessionManager.validateTokens(createExpiringSoonTokenPair());

      // Token with 30 seconds left is invalid (< 1 min threshold)
      expect(validation.isValid).toBe(false);
      expect(validation.needsRefresh).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      const expiredTokens = createExpiredTokenPair();
      mockStorage.getTokens.mockReturnValue(expiredTokens);

      // Mock successful refresh response (matches actual API envelope format)
      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          accessToken: 'new-access-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer',
        },
      });

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/public/auth/refresh', {
        refreshToken: expiredTokens.refreshToken,
      });
      expect(mockStorage.setTokens).toHaveBeenCalled();
    });

    it('should handle refresh failure gracefully', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const refreshPromise = sessionManager.refreshTokens();

      // Advance through retry delays (exponential backoff: 100ms, 200ms, 400ms)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const result = await refreshPromise;

      expect(result).toBe(false);
    });

    it('should not refresh concurrently - only one HTTP call', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());

      let resolveRefresh: (value: unknown) => void;
      const pendingRefresh = new Promise(resolve => {
        resolveRefresh = resolve;
      });
      mockHttpClient.post.mockReturnValue(pendingRefresh);

      // Start two refresh calls simultaneously
      const firstCall = sessionManager.refreshTokens();
      const secondCall = sessionManager.refreshTokens();

      // Resolve the refresh
      resolveRefresh!({
        success: true,
        data: {
          accessToken: 'new-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer',
        },
      });

      // Both should resolve to true
      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);
      expect(firstResult).toBe(true);
      expect(secondResult).toBe(true);

      // Should only have called post once (not twice)
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should retry failed refresh attempts', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());

      // Fail first two attempts, succeed on third
      mockHttpClient.post
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            accessToken: 'new-token',
            accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
            tokenType: 'Bearer',
          },
        });

      const refreshPromise = sessionManager.refreshTokens();

      // Advance through retry delays (exponential backoff: 100ms, 200ms)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const result = await refreshPromise;

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retry attempts', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());
      mockHttpClient.post.mockRejectedValue(new Error('Persistent error'));

      const refreshPromise = sessionManager.refreshTokens();

      // Advance through retry delays (exponential backoff: 100ms, 200ms, 400ms)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const result = await refreshPromise;

      expect(result).toBe(false);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(testConfig.maxRetries);
    });

    it('should fail if refresh token is expired', async () => {
      const expiredRefreshToken: TokenPair = {
        ...createExpiredTokenPair(),
        refreshTokenExpiry: new Date(Date.now() - 60 * 1000), // Refresh token also expired
      };
      mockStorage.getTokens.mockReturnValue(expiredRefreshToken);

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
      expect(mockHttpClient.post).not.toHaveBeenCalled(); // Should not attempt refresh
      expect(mockStorage.clearTokens).toHaveBeenCalled(); // Should clear session
    });
  });

  describe('Valid Token Retrieval', () => {
    it('should return valid token without refresh', async () => {
      const validTokens = createValidTokenPair();
      mockStorage.getTokens.mockReturnValue(validTokens);

      const token = await sessionManager.getValidAccessToken();

      expect(token).toBe(validTokens.accessToken);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should refresh and return new token when expired', async () => {
      const expiredTokens = createExpiredTokenPair();
      const newTokens = {
        ...expiredTokens,
        accessToken: 'refreshed-token',
        accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
      };

      mockStorage.getTokens
        .mockReturnValueOnce(expiredTokens) // First call: expired
        .mockReturnValueOnce(expiredTokens) // Inside refreshTokens
        .mockReturnValue(newTokens); // After refresh

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          accessToken: 'refreshed-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer',
        },
      });

      const token = await sessionManager.getValidAccessToken();

      expect(token).toBe('refreshed-token');
      expect(mockHttpClient.post).toHaveBeenCalled();
    });

    it('should return null when no tokens available', async () => {
      mockStorage.getTokens.mockReturnValue(null);

      const token = await sessionManager.getValidAccessToken();

      expect(token).toBeNull();
    });

    it('should return null when refresh fails', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());
      mockHttpClient.post.mockRejectedValue(new Error('Refresh failed'));

      const tokenPromise = sessionManager.getValidAccessToken();

      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const token = await tokenPromise;

      expect(token).toBeNull();
    });
  });

  describe('Session Status', () => {
    it('should return authenticated for valid tokens', () => {
      mockStorage.getTokens.mockReturnValue(createValidTokenPair());

      const status = sessionManager.getSessionStatus();

      expect(status).toBe('authenticated');
    });

    it('should return expired when refresh token is expired', () => {
      mockStorage.getTokens.mockReturnValue({
        ...createValidTokenPair(),
        refreshTokenExpiry: new Date(Date.now() - 60 * 1000),
      });

      const status = sessionManager.getSessionStatus();

      expect(status).toBe('expired');
    });

    it('should return unauthenticated when no tokens', () => {
      mockStorage.getTokens.mockReturnValue(null);

      const status = sessionManager.getSessionStatus();

      expect(status).toBe('unauthenticated');
    });

    it('should return refreshing during refresh operation', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());

      let resolveRefresh: (value: unknown) => void;
      const pendingRefresh = new Promise(resolve => {
        resolveRefresh = resolve;
      });
      mockHttpClient.post.mockReturnValue(pendingRefresh);

      // Start refresh (don't await)
      const refreshPromise = sessionManager.refreshTokens();

      // Status should be refreshing
      expect(sessionManager.getSessionStatus()).toBe('refreshing');

      // Complete refresh
      resolveRefresh!({
        success: true,
        data: {
          accessToken: 'new-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer',
        },
      });
      await refreshPromise;

      // Status should be authenticated again (getTokens still returns expired in mock)
      mockStorage.getTokens.mockReturnValue(createValidTokenPair());
      expect(sessionManager.getSessionStatus()).toBe('authenticated');
    });
  });

  describe('Token Management', () => {
    it('should store tokens and schedule refresh', () => {
      const tokens = createValidTokenPair();

      sessionManager.setTokens(tokens);

      expect(mockStorage.setTokens).toHaveBeenCalledWith(tokens);
    });

    it('should return stored tokens', () => {
      const tokens = createValidTokenPair();
      mockStorage.getTokens.mockReturnValue(tokens);

      const result = sessionManager.getTokens();

      expect(result).toEqual(tokens);
    });
  });

  describe('Session Cleanup', () => {
    it('should clear tokens on clearSession', () => {
      sessionManager.clearSession();

      expect(mockStorage.clearTokens).toHaveBeenCalled();
    });

    it('should cancel scheduled refresh on clearSession', () => {
      const tokens = createValidTokenPair();
      mockStorage.getTokens.mockReturnValue(tokens);

      // Set tokens to schedule refresh
      sessionManager.setTokens(tokens);

      // Clear session
      sessionManager.clearSession();

      // Fast forward past refresh time
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Refresh should not have been called (timer was cancelled)
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed token response', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());
      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          // Missing required accessToken field
          tokenType: 'Bearer',
        },
      });

      const refreshPromise = sessionManager.refreshTokens();

      // Advance through retry delays (malformed response triggers retries)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const result = await refreshPromise;

      expect(result).toBe(false);
    });

    it('should handle unsuccessful response', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());
      mockHttpClient.post.mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });

      const refreshPromise = sessionManager.refreshTokens();

      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const result = await refreshPromise;

      expect(result).toBe(false);
    });

    it('should handle no tokens for refresh', async () => {
      mockStorage.getTokens.mockReturnValue(null);

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Check', () => {
    it('should return true when authenticated', () => {
      mockStorage.getTokens.mockReturnValue(createValidTokenPair());

      expect(sessionManager.isAuthenticated()).toBe(true);
    });

    it('should return false when no tokens', () => {
      mockStorage.getTokens.mockReturnValue(null);

      expect(sessionManager.isAuthenticated()).toBe(false);
    });

    it('should return true during refresh', async () => {
      mockStorage.getTokens.mockReturnValue(createExpiredTokenPair());

      let resolveRefresh: (value: unknown) => void;
      mockHttpClient.post.mockReturnValue(
        new Promise(resolve => {
          resolveRefresh = resolve;
        })
      );

      const refreshPromise = sessionManager.refreshTokens();

      // Should be authenticated during refresh
      expect(sessionManager.isAuthenticated()).toBe(true);

      resolveRefresh!({
        success: true,
        data: { accessToken: 'new', accessTokenExpiry: new Date(), tokenType: 'Bearer' },
      });
      await refreshPromise;
    });
  });
});
