/**
 * Authentication Store
 *
 * OAuth 2.0 dual-token architecture with automatic refresh.
 * Access tokens are short-lived, refresh tokens handle renewal.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clearAllCaches } from '@app/cache/queryClient';
import { SessionService, LocalStorageSessionStorage } from '@app/services/SessionService';
import { modalStore } from '@app/stores/modalStore';
import { authHttpClient } from '@infra/api/AuthHttpClient';
import { configureHttpClientWithSessionService } from '@infra/api/HttpClient';
import { logger } from '@infra/logger';
import { env } from '@shared/config';

import { authService, isPasswordChangeRequired } from '../services/AuthService';

import type { User } from '../types';
import type { PasswordChangeRequiredResponse } from '../types/apiTypes';
import type { AuthDebugInfo } from '../types/debugTypes';
import type { RegisterWithResearcherRequest } from '@odysseus/shared-schemas';
import type { TokenPair, SessionStatus } from '@shared/types/sessionTypes';

/** Structured result from login for explicit error handling */
export type LoginResult =
  | { success: true }
  | { success: false; error: string }
  | { success: 'password_change_required' };

interface AuthState {
  // Core session data
  user: User | null;
  tokens: TokenPair | null;
  sessionStatus: SessionStatus;

  // UI state
  isLoading: boolean;
  error: string | null;
  logoutReason: 'idle_timeout' | 'token_expired' | 'manual_logout' | null;

  // Password change required state (admin reset flow)
  passwordChangeRequired: PasswordChangeRequiredResponse | null;

  // Password change success state (for showing confirmation before login completes)
  passwordChangeSuccess: boolean;

  // Computed properties
  isAuthenticated: boolean;
}

interface AuthActions {
  // Primary authentication methods
  login: (username: string, password: string) => Promise<LoginResult>;
  forceChangePassword: (newPassword: string) => Promise<boolean>;
  clearPasswordChangeRequired: () => void;
  register: (username: string, password: string) => Promise<boolean>;
  registerWithResearcher: (
    request: RegisterWithResearcherRequest
  ) => Promise<{ success: boolean; status?: 'approved' | 'pending'; message?: string }>;
  logout: () => Promise<void>;
  verify: () => Promise<boolean>;
  checkFirstTime: () => Promise<boolean>;

  // Session management
  updateSessionStatus: () => void;
  initializeFromStorage: () => void;

  // Internal state management
  setAuthData: (user: User, tokens: TokenPair) => void;
  clearAuth: (reason?: 'idle_timeout' | 'token_expired' | 'manual_logout') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Development debugging
  getDebugInfo: () => AuthDebugInfo | null;
}

interface AuthStore extends AuthState, AuthActions {}

// Initialize session manager with AuthHttpClient to prevent circular dependency
const sessionStorage = new LocalStorageSessionStorage();

// Callback pattern: SessionService notifies auth store when session expires
const sessionManager = new SessionService(
  authHttpClient,
  sessionStorage,
  reason => {
    useAuthStore.getState().clearAuth(reason);
  },
  undefined, // Use default config
  // Warning callbacks - wire up to modal store
  {
    showWarning: config => {
      modalStore.getState().showSessionTimeoutWarning(config);
    },
    updateWarning: timeRemainingMs => {
      modalStore.getState().updateSessionTimeoutWarning(timeRemainingMs);
    },
    hideWarning: () => {
      modalStore.getState().hideSessionTimeoutWarning();
    },
  }
);

configureHttpClientWithSessionService(sessionManager);

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // STATE

      user: null,
      tokens: null,
      sessionStatus: 'unauthenticated',
      isLoading: false,
      error: null,
      logoutReason: null,
      passwordChangeRequired: null,
      passwordChangeSuccess: false,

      isAuthenticated: false,

      // AUTHENTICATION METHODS

      /**
       * Login with username and password (primary method)
       *
       * Returns structured result with error message for explicit handling.
       */
      login: async (username: string, password: string): Promise<LoginResult> => {
        set({ isLoading: true, error: null, logoutReason: null, passwordChangeRequired: null });

        try {
          const result = await authService.login({ username, password });

          if (isPasswordChangeRequired(result)) {
            logger.info('Password change required for user', { username: result.user.username });

            set({
              passwordChangeRequired: result,
              isLoading: false,
              error: null,
            });

            return { success: 'password_change_required' };
          }

          const userWithActivity = {
            ...result.user,
            lastActivity: new Date().toISOString(),
          };

          // Set tokens in session manager (handles HTTP client + storage)
          sessionManager.setTokens(result.tokens);

          set({
            user: userWithActivity,
            tokens: result.tokens,
            sessionStatus: 'authenticated',
            isAuthenticated: true,
            isLoading: false,
            error: null,
            logoutReason: null,
            passwordChangeRequired: null,
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login error';
          logger.error('Auth store login exception', { error });

          set({
            error: errorMessage,
            isLoading: false,
          });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Force change password using temp token from login
       *
       * Called when login returns 'password_change_required'.
       * Completes login after successful password change.
       */
      forceChangePassword: async (newPassword: string) => {
        const { passwordChangeRequired } = get();

        if (!passwordChangeRequired) {
          logger.error('No password change required state found');
          set({ error: 'Invalid state - no password change in progress' });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const result = await authService.forceChangePassword(
            passwordChangeRequired.tempToken,
            newPassword
          );

          const userWithActivity = {
            ...result.user,
            lastActivity: new Date().toISOString(),
          };

          // Set tokens in session manager (handles HTTP client + storage)
          sessionManager.setTokens(result.tokens);

          // Show success confirmation before completing authentication
          set({
            isLoading: false,
            passwordChangeRequired: null,
            passwordChangeSuccess: true,
          });

          // Brief delay to show success animation
          await new Promise(resolve => setTimeout(resolve, 2500));

          set({
            user: userWithActivity,
            tokens: result.tokens,
            sessionStatus: 'authenticated',
            isAuthenticated: true,
            error: null,
            logoutReason: null,
            passwordChangeSuccess: false,
          });

          logger.info('Password changed and login completed', { userId: result.user.id });
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password change failed';
          logger.error('Force change password exception', { error });

          set({
            error: errorMessage,
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Clear password change required state
       *
       * Called when user cancels password change or navigates away.
       */
      clearPasswordChangeRequired: () => {
        set({ passwordChangeRequired: null, error: null });
      },

      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.register({ username, password });

          const userWithActivity = {
            ...result.user,
            lastActivity: new Date().toISOString(),
          };

          // Set tokens in session manager (handles HTTP client + storage)
          sessionManager.setTokens(result.tokens);

          set({
            user: userWithActivity,
            tokens: result.tokens,
            sessionStatus: 'authenticated',
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration error';
          logger.error('Auth store registration exception', { error });

          set({
            error: errorMessage,
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Register with researcher profile (approval workflow)
       *
       * First user: Auto-approved as admin (authenticated immediately)
       * Subsequent users: Pending approval (awaiting admin action)
       */
      registerWithResearcher: async (request: RegisterWithResearcherRequest) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.registerWithResearcher(request);

          // Case 1: Approved (first user) - Has tokens, authenticate immediately
          if (result.status === 'approved' && result.tokens) {
            const userWithActivity = {
              ...result.user,
              lastActivity: new Date().toISOString(),
            };

            sessionManager.setTokens(result.tokens);

            set({
              user: userWithActivity,
              tokens: result.tokens,
              sessionStatus: 'authenticated',
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return {
              success: true,
              status: 'approved',
              message: result.message,
            };
          }

          // Case 2: Pending (subsequent users) - No tokens, awaiting approval
          if (result.status === 'pending') {
            set({
              user: null, // Don't set user until approved
              tokens: null,
              sessionStatus: 'unauthenticated',
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });

            return {
              success: true,
              status: 'pending',
              message: result.message,
            };
          }

          throw new Error('Invalid registration response status');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration error';
          logger.error('Auth store registerWithResearcher exception', { error });

          set({
            error: errorMessage,
            isLoading: false,
          });

          return {
            success: false,
            message: errorMessage,
          };
        }
      },

      verify: async () => {
        const tokens = sessionManager.getTokens();
        if (!tokens) {
          set({ sessionStatus: 'unauthenticated' });
          return false;
        }

        try {
          // Use SessionService to get valid token (auto-refreshes if needed)
          const validToken = await sessionManager.getValidAccessToken();

          if (!validToken) {
            get().clearAuth();
            return false;
          }

          const result = await authService.verifySession();

          set({
            user: {
              ...result.user,
              lastActivity: new Date().toISOString(),
            },
            tokens: sessionManager.getTokens(),
            sessionStatus: 'authenticated',
            error: null,
          });
          return true;
        } catch (error) {
          logger.error('Auth store session verification error', { error });
          get().clearAuth();
          return false;
        }
      },

      checkFirstTime: async () => {
        try {
          const result = await authService.checkFirstTime();
          return result.isFirstTime;
        } catch (error) {
          logger.error('Auth store first time check failed', { error });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // Attempt graceful logout with backend
          await authService.logout();
        } catch (error) {
          logger.warn('Backend logout failed (clearing local session anyway)', { error });
        }

        // Always clear local session regardless of backend response
        sessionManager.clearSession();
        get().clearAuth();
      },

      // SESSION MANAGEMENT

      updateSessionStatus: () => {
        const newStatus = sessionManager.getSessionStatus();
        const currentStatus = get().sessionStatus;

        if (newStatus !== currentStatus) {
          set({ sessionStatus: newStatus });
        }
      },

      /**
       * Initialize store from persistent storage
       *
       * Tokens loaded from SessionService, user already rehydrated by Zustand persist.
       */
      initializeFromStorage: () => {
        const tokens = sessionManager.getTokens();
        const user = get().user;

        if (tokens && user) {
          set({
            tokens,
            sessionStatus: sessionManager.getSessionStatus(),
            isAuthenticated: true,
          });
        } else {
          set({
            sessionStatus: 'unauthenticated',
            isAuthenticated: false,
          });
        }
      },

      // INTERNAL STATE MANAGEMENT

      setAuthData: (user: User, tokens: TokenPair) => {
        set({
          user,
          tokens,
          sessionStatus: 'authenticated',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      clearAuth: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout' = 'manual_logout') => {
        // Clear React Query cache so next user gets fresh data (critical for demo isolation)
        clearAllCaches();

        set({
          user: null,
          tokens: null,
          sessionStatus: 'unauthenticated',
          isAuthenticated: false,
          isLoading: false,
          error: null,
          logoutReason: reason,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      reset: () => {
        sessionManager.clearSession();
        get().clearAuth();
      },

      getDebugInfo: () => {
        if (!env.isDev()) {
          return null;
        }

        const sessionDebug = sessionManager.getDebugInfo();
        const storeState = get();

        return {
          storeState: {
            hasUser: !!storeState.user,
            hasTokens: !!storeState.tokens,
            sessionStatus: storeState.sessionStatus,
            isLoading: storeState.isLoading,
            error: storeState.error,
          },
          sessionManager: sessionDebug,
        };
      },
    }),
    {
      name: 'odysseus-auth-enhanced',

      // Only persist user data, tokens handled by SessionService
      partialize: state => ({
        user: state.user,
      }),

      // Don't use onRehydrateStorage: fires multiple times with unpredictable state
    }
  )
);

export { sessionManager };

// Development-only global debugging (removed in production builds)
if (env.isDev()) {
  globalThis.__ODYSSEUS_SESSION_DEBUG__ = () => {
    const authState = useAuthStore.getState();
    return authState.getDebugInfo();
  };
}
