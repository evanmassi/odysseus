/**
 * Auth Store Tests
 *
 * Tests authentication flows, session management, and error scenarios.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from './authStore';

import type { TokenPair } from '../../../shared/session/types';

// Hoisted mocks must be declared before vi.mock calls
const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  verify: vi.fn(),
  logout: vi.fn(),
  checkFirstTime: vi.fn(),
  verifySession: vi.fn(),
  registerWithResearcher: vi.fn(),
  forceChangePassword: vi.fn(),
}));

const mockSessionManager = vi.hoisted(() => ({
  getValidAccessToken: vi.fn(),
  isAuthenticated: vi.fn(),
  getSessionStatus: vi.fn().mockReturnValue('unauthenticated'),
  setTokens: vi.fn(),
  clearSession: vi.fn(),
  getDebugInfo: vi.fn(),
  getTokens: vi.fn(),
}));

// Mock external dependencies
vi.mock('../services/AuthenticationService', () => ({
  authService: mockAuthService,
  isPasswordChangeRequired: vi.fn(() => false),
}));

vi.mock('../../../infrastructure/api/httpClient', () => ({
  httpClient: {
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  },
  configureHttpClientWithSessionManager: vi.fn(),
}));

vi.mock('@app/services/SessionManager', () => ({
  SessionManager: vi.fn(() => mockSessionManager),
  LocalStorageSessionStorage: vi.fn(),
}));

vi.mock('@app/stores/modalStore', () => ({
  modalStore: {
    getState: vi.fn(() => ({
      showSessionTimeoutWarning: vi.fn(),
      updateSessionTimeoutWarning: vi.fn(),
      hideSessionTimeoutWarning: vi.fn(),
    })),
  },
}));

vi.mock('@infra/api/AuthHttpClient', () => ({
  authHttpClient: {},
}));

// Import after mocks are set up

// Test data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  role: 'user' as const,
  lastActivity: new Date().toISOString(),
};

const mockTokens: TokenPair = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
  refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  tokenType: 'Bearer',
};

const mockLoginResponse = {
  user: mockUser,
  tokens: mockTokens,
};

describe('Enhanced AuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.sessionStatus).toBe('unauthenticated');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should restore session from storage on initialization', () => {
      // Set up mocks FIRST
      mockSessionManager.getTokens.mockReturnValue(mockTokens);
      mockSessionManager.getSessionStatus.mockReturnValue('authenticated');

      // Use renderHook to properly observe reactive state changes
      const { result } = renderHook(() => useAuthStore());

      // Manually set user (simulating Zustand rehydration from localStorage)
      act(() => {
        result.current.setAuthData(mockUser, mockTokens);
      });

      // Now call initializeFromStorage which checks tokens + user
      act(() => {
        result.current.initializeFromStorage();
      });

      expect(result.current.sessionStatus).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      // AuthService.login returns { user, tokens } directly (no success wrapper)
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const loginResult = await result.current.login('testuser', 'password');
        expect(loginResult).toEqual({ success: true });
      });

      // User has fresh lastActivity added by the store
      expect(result.current.user?.id).toBe(mockUser.id);
      expect(result.current.user?.username).toBe(mockUser.username);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.sessionStatus).toBe('authenticated');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSessionManager.setTokens).toHaveBeenCalledWith(mockTokens);
    });

    it('should handle login failure', async () => {
      // AuthService throws on failure
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const loginResult = await result.current.login('testuser', 'wrongpassword');
        expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' });
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.sessionStatus).toBe('unauthenticated');
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should handle network errors during login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const loginResult = await result.current.login('testuser', 'password');
        expect(loginResult).toEqual({ success: false, error: 'Network error' });
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      mockAuthService.login.mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        void result.current.login('testuser', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        // AuthService returns { user, tokens } directly
        resolveLogin!(mockLoginResponse);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Registration Flow', () => {
    it('should register successfully with valid data', async () => {
      // AuthService.register returns { user, tokens } directly
      mockAuthService.register.mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.register('newuser', 'password');
        expect(success).toBe(true);
      });

      // User has fresh lastActivity added by the store
      expect(result.current.user?.id).toBe(mockUser.id);
      expect(result.current.user?.username).toBe(mockUser.username);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.sessionStatus).toBe('authenticated');
    });

    it('should handle registration failure', async () => {
      // AuthService throws on failure
      mockAuthService.register.mockRejectedValue(new Error('Username already exists'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.register('existinguser', 'password');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Username already exists');
    });
  });

  describe('Session Verification', () => {
    it('should verify valid session', async () => {
      // verify() first checks sessionManager.getTokens(), then getValidAccessToken()
      mockSessionManager.getTokens.mockReturnValue(mockTokens);
      mockSessionManager.getValidAccessToken.mockResolvedValue('valid-token');
      // verifySession returns { user, tokens }
      mockAuthService.verifySession.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isValid = await result.current.verify();
        expect(isValid).toBe(true);
      });

      // User has fresh lastActivity added by the store
      expect(result.current.user?.id).toBe(mockUser.id);
      expect(result.current.sessionStatus).toBe('authenticated');
    });

    it('should handle invalid session when no tokens', async () => {
      // No tokens in session manager
      mockSessionManager.getTokens.mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isValid = await result.current.verify();
        expect(isValid).toBe(false);
      });

      expect(result.current.sessionStatus).toBe('unauthenticated');
    });

    it('should handle invalid session when token refresh fails', async () => {
      mockSessionManager.getTokens.mockReturnValue(mockTokens);
      mockSessionManager.getValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isValid = await result.current.verify();
        expect(isValid).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.sessionStatus).toBe('unauthenticated');
    });
  });

  describe('Logout Flow', () => {
    it('should logout and clear all session data', async () => {
      // Set up authenticated state first
      const store = useAuthStore.getState();
      act(() => {
        store.setAuthData(mockUser, mockTokens);
      });

      mockAuthService.logout.mockResolvedValue({ success: true });

      await act(async () => {
        await store.logout();
      });

      expect(store.user).toBeNull();
      expect(store.tokens).toBeNull();
      expect(store.sessionStatus).toBe('unauthenticated');
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
    });

    it('should clear session even if logout API call fails', async () => {
      const store = useAuthStore.getState();
      act(() => {
        store.setAuthData(mockUser, mockTokens);
      });

      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await act(async () => {
        await store.logout();
      });

      // Should still clear local session
      expect(store.user).toBeNull();
      expect(store.tokens).toBeNull();
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
    });
  });

  describe('Session Status Management', () => {
    it('should update session status based on SessionManager', () => {
      mockSessionManager.getSessionStatus.mockReturnValue('refreshing');

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.updateSessionStatus();
      });

      expect(result.current.sessionStatus).toBe('refreshing');
    });

    it('should provide isAuthenticated computed property', () => {
      // Use renderHook to properly observe reactive state changes
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuthData(mockUser, mockTokens);
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when starting new operations', async () => {
      // Use renderHook to properly observe reactive state changes
      const { result } = renderHook(() => useAuthStore());

      // Set error state
      act(() => {
        result.current.setError('Previous error');
      });

      expect(result.current.error).toBe('Previous error');

      // Start new login - AuthService returns { user, tokens } directly
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await act(async () => {
        await result.current.login('user', 'pass');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Development Debugging', () => {
    it('should provide debug info in development', () => {
      const sessionManagerDebug = {
        sessionStatus: 'authenticated',
        accessTokenExpiresIn: '25 minutes',
        nextRefreshIn: '20 minutes',
      };
      mockSessionManager.getDebugInfo.mockReturnValue(sessionManagerDebug);

      const { result } = renderHook(() => useAuthStore());

      const debugInfo = result.current.getDebugInfo();

      // getDebugInfo returns { storeState: {...}, sessionManager: {...} }
      expect(debugInfo).toHaveProperty('storeState');
      expect(debugInfo).toHaveProperty('sessionManager');
      expect(debugInfo?.sessionManager).toEqual(sessionManagerDebug);
    });

    // Note: Production check uses env.isDev() which requires more complex mocking
    // Skipping production test as it requires mocking the env module
  });

  describe('First Time Setup', () => {
    it('should check first time setup correctly', async () => {
      mockAuthService.checkFirstTime.mockResolvedValue({
        isFirstTime: true,
        needsSystemAdmin: true,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isFirstTime = await result.current.checkFirstTime();
        expect(isFirstTime).toBe(true);
      });
    });

    it('should return false when not first time', async () => {
      mockAuthService.checkFirstTime.mockResolvedValue({
        isFirstTime: false,
        needsSystemAdmin: false,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isFirstTime = await result.current.checkFirstTime();
        expect(isFirstTime).toBe(false);
      });
    });
  });

  describe('State Persistence', () => {
    it('should restore authenticated state when tokens and user exist', () => {
      // Set up mocks FIRST
      mockSessionManager.getTokens.mockReturnValue(mockTokens);
      mockSessionManager.getSessionStatus.mockReturnValue('authenticated');

      // Use renderHook to properly observe reactive state changes
      const { result } = renderHook(() => useAuthStore());

      // First set up authenticated state
      act(() => {
        result.current.setAuthData(mockUser, mockTokens);
      });

      // Simulate page reload - call initializeFromStorage
      act(() => {
        result.current.initializeFromStorage();
      });

      // Should be authenticated (user from Zustand state + tokens from sessionManager)
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.sessionStatus).toBe('authenticated');
    });

    it('should remain unauthenticated when tokens missing', () => {
      // Mock sessionManager to return no tokens
      mockSessionManager.getTokens.mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      // Set user but sessionManager has no tokens
      act(() => {
        result.current.setAuthData(mockUser, mockTokens);
      });

      act(() => {
        result.current.initializeFromStorage();
      });

      // Should be unauthenticated (missing tokens from sessionManager)
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.sessionStatus).toBe('unauthenticated');
    });
  });
});
