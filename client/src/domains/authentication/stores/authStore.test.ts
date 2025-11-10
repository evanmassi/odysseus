/**
 * Enhanced Auth Store Tests
 * 
 * Comprehensive test suite for the new token-based authentication store.
 * Tests all authentication flows, session management, and error scenarios.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from './authStore';

import type { TokenPair} from '../../../shared/session/types';

// Mock SessionManager
const mockSessionManager = {
  getValidAccessToken: vi.fn(),
  isAuthenticated: vi.fn(),
  getSessionStatus: vi.fn(),
  setTokens: vi.fn(),
  clearSession: vi.fn(),
  getDebugInfo: vi.fn()
};

// Mock auth service
const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  verify: vi.fn(),
  logout: vi.fn(),
  checkFirstTime: vi.fn()
};

// Test data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  role: 'user' as const,
  lastActivity: new Date().toISOString()
};

const mockTokens: TokenPair = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  accessTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
  refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  tokenType: 'Bearer'
};

const mockLoginResponse = {
  user: mockUser,
  tokens: mockTokens
};

// Mock external dependencies
vi.mock('../../../application/auth/AuthenticationService', () => ({
  authService: mockAuthService
}));

vi.mock('../../../infrastructure/api/httpClient', () => ({
  httpClient: {
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn()
  }
}));

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
      const store = useAuthStore.getState();
      mockSessionManager.isAuthenticated.mockReturnValue(true);
      mockSessionManager.getSessionStatus.mockReturnValue('authenticated');
      
      act(() => {
        store.initializeFromStorage();
      });

      expect(store.sessionStatus).toBe('authenticated');
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        success: true,
        ...mockLoginResponse
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login('testuser', 'password');
        expect(success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.sessionStatus).toBe('authenticated');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSessionManager.setTokens).toHaveBeenCalledWith(mockTokens);
    });

    it('should handle login failure', async () => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login('testuser', 'wrongpassword');
        expect(success).toBe(false);
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
        const success = await result.current.login('testuser', 'password');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
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
        resolveLogin!({ success: true, ...mockLoginResponse });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Registration Flow', () => {
    it('should register successfully with valid data', async () => {
      mockAuthService.register.mockResolvedValue({
        success: true,
        ...mockLoginResponse
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.register('newuser', 'password');
        expect(success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.sessionStatus).toBe('authenticated');
    });

    it('should handle registration failure', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Username already exists'
      });

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
      mockAuthService.verify.mockResolvedValue({
        success: true,
        user: mockUser
      });
      mockSessionManager.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isValid = await result.current.verify();
        expect(isValid).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.sessionStatus).toBe('authenticated');
    });

    it('should handle invalid session', async () => {
      mockAuthService.verify.mockResolvedValue({
        success: false
      });
      mockSessionManager.isAuthenticated.mockReturnValue(false);

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
      const store = useAuthStore.getState();
      
      act(() => {
        store.setAuthData(mockUser, mockTokens);
      });

      expect(store.isAuthenticated).toBe(true);

      act(() => {
        store.clearAuth();
      });

      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when starting new operations', async () => {
      const store = useAuthStore.getState();
      
      // Set error state
      act(() => {
        store.setError('Previous error');
      });

      expect(store.error).toBe('Previous error');

      // Start new login
      mockAuthService.login.mockResolvedValue({
        success: true,
        ...mockLoginResponse
      });

      await act(async () => {
        await store.login('user', 'pass');
      });

      expect(store.error).toBeNull();
    });
  });

  describe('Development Debugging', () => {
    it('should provide debug info in development', () => {
      mockSessionManager.getDebugInfo.mockReturnValue({
        sessionStatus: 'authenticated',
        accessTokenExpiresIn: '25 minutes',
        nextRefreshIn: '20 minutes'
      });

      const { result } = renderHook(() => useAuthStore());

      const debugInfo = result.current.getDebugInfo();
      
      expect(debugInfo).toEqual({
        sessionStatus: 'authenticated',
        accessTokenExpiresIn: '25 minutes',
        nextRefreshIn: '20 minutes'
      });
    });

    it('should return null in production', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      mockSessionManager.getDebugInfo.mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());
      const debugInfo = result.current.getDebugInfo();

      expect(debugInfo).toBeNull();

      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('First Time Setup', () => {
    it('should check first time setup correctly', async () => {
      mockAuthService.checkFirstTime.mockResolvedValue({
        success: true,
        isFirstTime: true
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const isFirstTime = await result.current.checkFirstTime();
        expect(isFirstTime).toBe(true);
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist authentication state', () => {
      const store = useAuthStore.getState();

      act(() => {
        store.setAuthData(mockUser, mockTokens);
      });

      // Simulate page reload - create new store instance
      const newStore = useAuthStore.getState();
      
      act(() => {
        newStore.initializeFromStorage();
      });

      // Should restore from SessionManager
      mockSessionManager.isAuthenticated.mockReturnValue(true);
      expect(newStore.isAuthenticated).toBe(true);
    });
  });
});
