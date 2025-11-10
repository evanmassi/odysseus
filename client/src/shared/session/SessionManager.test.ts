/**
 * SessionManager Tests
 * 
 * Comprehensive test suite for session management functionality.
 * Tests all token refresh scenarios, error handling, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SessionManager } from '@app/services/SessionManager';

import type { TokenPair, SessionConfig } from './types';

// Mock HTTP client
const mockHttpClient = {
  post: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn()
};

// Mock storage
const mockStorage = {
  getTokens: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getUser: vi.fn(),
  setUser: vi.fn(),
  clearUser: vi.fn()
};

// Test data
const validTokenPair: TokenPair = {
  accessToken: 'valid-access-token',
  refreshToken: 'valid-refresh-token',
  accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
  refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  tokenType: 'Bearer'
};

const expiredTokenPair: TokenPair = {
  ...validTokenPair,
  accessTokenExpiry: new Date(Date.now() - 60 * 1000), // 1 min ago
};

const expiringSoonTokenPair: TokenPair = {
  ...validTokenPair,
  accessTokenExpiry: new Date(Date.now() + 2 * 60 * 1000), // 2 min from now (within refresh buffer)
};

const testConfig: SessionConfig = {
  refreshBufferMinutes: 5,
  maxRetries: 3,
  retryDelayMs: 100 // Fast retries for testing
};

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionManager = new SessionManager(mockHttpClient as any, mockStorage as any, undefined, testConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionManager.destroy();
  });

  describe('Token Validation', () => {
    it('should validate valid tokens correctly', () => {
      const validation = sessionManager.validateTokens(validTokenPair);
      
      expect(validation.isValid).toBe(true);
      expect(validation.needsRefresh).toBe(false);
      expect(validation.expiresIn).toBeGreaterThan(25 * 60 * 1000); // > 25 minutes
    });

    it('should detect expired tokens', () => {
      const validation = sessionManager.validateTokens(expiredTokenPair);
      
      expect(validation.isValid).toBe(false);
      expect(validation.needsRefresh).toBe(true);
      expect(validation.expiresIn).toBeLessThan(0);
    });

    it('should detect tokens needing refresh', () => {
      const validation = sessionManager.validateTokens(expiringSoonTokenPair);
      
      expect(validation.isValid).toBe(true);
      expect(validation.needsRefresh).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      const newTokens = {
        ...validTokenPair,
        accessToken: 'new-access-token',
        accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000)
      };

      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockResolvedValue({
        data: {
          success: true,
          accessToken: newTokens.accessToken,
          accessTokenExpiry: newTokens.accessTokenExpiry,
          tokenType: 'Bearer'
        }
      });

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/public/auth/refresh', {
        refreshToken: expiringSoonTokenPair.refreshToken
      });
      expect(mockStorage.setTokens).toHaveBeenCalled();
    });

    it('should handle refresh failure gracefully', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
      expect(sessionManager.getSessionStatus()).toBe('invalid');
    });

    it('should not refresh if already refreshing', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      
      // Start first refresh (don't resolve yet)
      let resolveFirst: (value: any) => void;
      const firstRefresh = new Promise(resolve => { resolveFirst = resolve; });
      mockHttpClient.post.mockReturnValue(firstRefresh);

      const firstCall = sessionManager.refreshTokens();
      const secondCall = sessionManager.refreshTokens();

      // Second call should return the same promise
      expect(firstCall).toBe(secondCall);

      // Resolve first refresh
      resolveFirst!({ data: { success: true, accessToken: 'new-token', accessTokenExpiry: new Date(), tokenType: 'Bearer' } });
      
      const result = await firstCall;
      expect(result).toBe(true);
    });

    it('should retry failed refresh attempts', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      
      // Fail first two attempts
      mockHttpClient.post
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce({
          data: {
            success: true,
            accessToken: 'new-token',
            accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
            tokenType: 'Bearer'
          }
        });

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retry attempts', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockRejectedValue(new Error('Persistent error'));

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(testConfig.maxRetries);
    });
  });

  describe('Valid Token Retrieval', () => {
    it('should return valid token without refresh', async () => {
      mockStorage.getTokens.mockReturnValue(validTokenPair);

      const token = await sessionManager.getValidAccessToken();

      expect(token).toBe(validTokenPair.accessToken);
      expect(mockHttpClient.post).not.toHaveBeenCalled(); // No refresh needed
    });

    it('should refresh and return new token when needed', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockResolvedValue({
        data: {
          success: true,
          accessToken: 'refreshed-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer'
        }
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
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockRejectedValue(new Error('Refresh failed'));

      const token = await sessionManager.getValidAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('Session Status', () => {
    it('should return authenticated for valid tokens', () => {
      mockStorage.getTokens.mockReturnValue(validTokenPair);

      const status = sessionManager.getSessionStatus();

      expect(status).toBe('authenticated');
    });

    it('should return expired for expired tokens', () => {
      mockStorage.getTokens.mockReturnValue({
        ...validTokenPair,
        refreshTokenExpiry: new Date(Date.now() - 60 * 1000) // Refresh token expired
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
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise(resolve => { resolveRefresh = resolve; });
      mockHttpClient.post.mockReturnValue(refreshPromise);

      // Start refresh
      const refreshCall = sessionManager.refreshTokens();
      
      // Status should be refreshing
      expect(sessionManager.getSessionStatus()).toBe('refreshing');

      // Complete refresh
      resolveRefresh!({ data: { success: true, accessToken: 'new-token', accessTokenExpiry: new Date(), tokenType: 'Bearer' } });
      await refreshCall;

      // Status should be authenticated again
      expect(sessionManager.getSessionStatus()).toBe('authenticated');
    });
  });

  describe('Automatic Refresh Scheduling', () => {
    it('should schedule refresh before token expiry', () => {
      const scheduleSpy = vi.spyOn(sessionManager, 'scheduleTokenRefresh');
      
      sessionManager.setTokens(validTokenPair);

      expect(scheduleSpy).toHaveBeenCalledWith(validTokenPair.accessTokenExpiry);
    });

    it('should trigger refresh at scheduled time', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockResolvedValue({
        data: {
          success: true,
          accessToken: 'auto-refreshed-token',
          accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
          tokenType: 'Bearer'
        }
      });

      sessionManager.setTokens(expiringSoonTokenPair);

      // Fast forward to refresh time
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      // Wait for async refresh to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('Session Cleanup', () => {
    it('should clear all session data on logout', () => {
      sessionManager.clearSession();

      expect(mockStorage.clearTokens).toHaveBeenCalled();
      expect(mockStorage.clearUser).toHaveBeenCalled();
      expect(mockHttpClient.clearAuthToken).toHaveBeenCalled();
    });

    it('should cancel scheduled refresh on logout', () => {
      // Set tokens to schedule refresh
      sessionManager.setTokens(validTokenPair);
      
      // Clear session
      sessionManager.clearSession();

      // Fast forward past refresh time
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Refresh should not have been called
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed token response', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockResolvedValue({
        data: {
          success: true,
          // Missing required fields
        }
      });

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
      expect(sessionManager.getSessionStatus()).toBe('invalid');
    });

    it('should handle network timeout', async () => {
      mockStorage.getTokens.mockReturnValue(expiringSoonTokenPair);
      mockHttpClient.post.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      const result = await sessionManager.refreshTokens();

      expect(result).toBe(false);
    });
  });
});
