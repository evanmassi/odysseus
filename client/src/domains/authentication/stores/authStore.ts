/**
 * Authentication Store
 *
 * OAuth 2.0 dual-token architecture with automatic refresh.
 * Access tokens are short-lived, refresh tokens handle renewal.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SessionManager, LocalStorageSessionStorage } from '@app/services/SessionManager';
import { modalStore } from '@app/stores/modalStore';
import { authHttpClient } from '@infra/api/AuthHttpClient';
import { configureHttpClientWithSessionManager } from '@infra/api/httpClient';
import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

import { authService, isPasswordChangeRequired } from '../services/AuthenticationService';

import type { PasswordChangeRequiredResponse } from '../types/api';
import type { AuthDebugInfo } from '../types/debug';
import type { RegisterWithResearcherRequest } from '@odysseus/shared-schemas';
import type { TokenPair, SessionStatus } from '@shared/session/types';

// User interface (unchanged for compatibility)
export interface User {
  id: string;
  username: string;
  lastActivity: string;
  role?: 'admin' | 'user';
}

/**
 * Enhanced authentication state
 */
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

/**
 * Authentication actions (clean API)
 */
interface AuthActions {
  // Primary authentication methods
  login: (username: string, password: string) => Promise<boolean | 'password_change_required'>;
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

// Create session manager with callback for session expiration
// Callback pattern: SessionManager notifies auth store when session expires
const sessionManager = new SessionManager(
  authHttpClient,
  sessionStorage,
  reason => {
    // When session expires, clear auth store and trigger UI update
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

// Configure httpClient to use SessionManager for automatic token handling
configureHttpClientWithSessionManager(sessionManager);

/**
 * Enhanced authentication store with OAuth 2.0 dual-token architecture
 */
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

      // Authentication state (reactive to token changes)
      isAuthenticated: false,

      // AUTHENTICATION METHODS

      /**
       * Login with username and password (primary method)
       *
       * Returns:
       * - true: Login successful
       * - false: Login failed
       * - 'password_change_required': User must change password first
       */
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null, logoutReason: null, passwordChangeRequired: null });

        try {
          const result = await authService.login({ username, password });

          // Check if password change is required
          if (isPasswordChangeRequired(result)) {
            logger.info('Password change required for user', { username: result.user.username });

            set({
              passwordChangeRequired: result,
              isLoading: false,
              error: null,
            });

            return 'password_change_required';
          }

          const userWithActivity = {
            ...result.user,
            lastActivity: new Date().toISOString(), // Ensure lastActivity is set
          };

          // Set tokens in session manager (handles HTTP client + storage)
          sessionManager.setTokens(result.tokens);

          // Update store state (Zustand persist automatically saves user)
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

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login error';
          logger.error('Auth store login exception', { error });

          set({
            error: errorMessage,
            isLoading: false,
          });
          return false;
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
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Now complete authentication
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

      /**
       * Register new user account
       */
      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.register({ username, password });

          const userWithActivity = {
            ...result.user,
            lastActivity: new Date().toISOString(), // Ensure lastActivity is set
          };

          // Set tokens in session manager
          sessionManager.setTokens(result.tokens);

          // Update store state (Zustand persist automatically saves user)
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

            // Update store state (Zustand persist automatically saves user)
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

          // Unexpected state
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

      /**
       * Verify existing session
       */
      verify: async () => {
        const tokens = sessionManager.getTokens();
        if (!tokens) {
          set({ sessionStatus: 'unauthenticated' });
          return false;
        }

        try {
          // Use SessionManager to get valid token (auto-refreshes if needed)
          const validToken = await sessionManager.getValidAccessToken();

          if (!validToken) {
            get().clearAuth();
            return false;
          }

          // Verify with backend
          const result = await authService.verifySession();

          // AuthService returns AuthResponse directly
          set({
            user: {
              ...result.user,
              lastActivity: new Date().toISOString(), // Ensure lastActivity is set
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

      /**
       * Check if this is first-time setup
       */
      checkFirstTime: async () => {
        try {
          const result = await authService.checkFirstTime();
          return result; // AuthService returns boolean directly
        } catch (error) {
          logger.error('Auth store first time check failed', { error });
          return false;
        }
      },

      /**
       * Logout user and clear session
       */
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

      /**
       * Update session status from SessionManager
       */
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
       * Tokens loaded from SessionManager, user already rehydrated by Zustand persist.
       */
      initializeFromStorage: () => {
        const tokens = sessionManager.getTokens();
        const user = get().user; // Get from Zustand state (already persisted/rehydrated)

        if (tokens && user) {
          // Both tokens and user available - restore authenticated session
          set({
            tokens,
            sessionStatus: sessionManager.getSessionStatus(),
            isAuthenticated: true,
          });
        } else {
          // Missing tokens or user - unauthenticated
          set({
            sessionStatus: 'unauthenticated',
            isAuthenticated: false,
          });
        }
      },

      // INTERNAL STATE MANAGEMENT

      /**
       * Set authentication data (used by login/register)
       */
      setAuthData: (user: User, tokens: TokenPair) => {
        set({
          user,
          tokens,
          sessionStatus: 'authenticated',
          isLoading: false,
          error: null,
        });
      },

      /**
       * Clear authentication state
       *
       * @param reason - Why the session is being cleared (for UX messaging)
       */
      clearAuth: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout' = 'manual_logout') => {
        set({
          user: null,
          tokens: null,
          sessionStatus: 'unauthenticated',
          isAuthenticated: false, // Clear authentication state
          isLoading: false,
          error: null,
          logoutReason: reason,
        });
      },

      /**
       * Set loading state
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      /**
       * Set error state
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        sessionManager.clearSession();
        get().clearAuth();
      },

      /**
       * Development debugging information
       */
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

      // Only persist user data, tokens handled by SessionManager
      partialize: state => ({
        user: state.user,
      }),

      // Session restoration moved to AppBootstrapService for reliable, predictable initialization
      // onRehydrateStorage removed - it fires multiple times with unpredictable state
    }
  )
);

// Export session manager for HTTP client integration
export { sessionManager };

// Development-only global debugging (removed in production builds)
if (env.isDev()) {
  globalThis.__ODYSSEUS_SESSION_DEBUG__ = () => {
    const authState = useAuthStore.getState();
    return authState.getDebugInfo();
  };
}
