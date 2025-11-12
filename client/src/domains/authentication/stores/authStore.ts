/**
 * Enhanced Authentication Store
 *
 * OAuth 2.0 dual-token architecture with automatic refresh.
 *
 * Key improvements:
 * - Single token → Dual token (access + refresh)
 * - Manual token passing → Automatic token injection
 * - Reactive failure handling → Proactive token renewal
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SessionManager, LocalStorageSessionStorage } from '@app/services/SessionManager';
import { authHttpClient } from '@infra/api/AuthHttpClient';
import { configureHttpClientWithSessionManager } from '@infra/api/httpClient';
import { env } from '@shared/config';

import { authService } from '../services/AuthenticationService';

import type { RegisterWithResearcherRequest } from '@odysseus/shared-schemas';
import type {
  TokenPair,
  SessionStatus} from '@shared/session/types';

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

  // Computed properties
  isAuthenticated: boolean;
}

/**
 * Authentication actions (clean API)
 */
interface AuthActions {
  // Primary authentication methods
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  registerWithResearcher: (request: RegisterWithResearcherRequest) => Promise<{ success: boolean; status?: 'approved' | 'pending'; message?: string }>;
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
  getDebugInfo: () => any;
}

interface AuthStore extends AuthState, AuthActions {}

// Initialize session manager with AuthHttpClient to prevent circular dependency
const sessionStorage = new LocalStorageSessionStorage();

// Create session manager with callback for session expiration
// Callback pattern: SessionManager notifies auth store when session expires
const sessionManager = new SessionManager(
  authHttpClient,
  sessionStorage,
  (reason) => {
    // When session expires, clear auth store and trigger UI update
    useAuthStore.getState().clearAuth(reason);
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

      // Authentication state (reactive to token changes)
      isAuthenticated: false,

      // AUTHENTICATION METHODS

      /**
       * Login with username and password (primary method)
       */
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null, logoutReason: null });

        try {
          const result = await authService.login({ username, password });

          // AuthService now returns AuthResponse directly (not wrapped in success object)
          // Set tokens in session manager (handles HTTP client + storage)
          sessionManager.setTokens(result.tokens);

          // Update store state
          set({
            user: {
              ...result.user,
              lastActivity: new Date().toISOString() // Ensure lastActivity is set
            },
            tokens: result.tokens,
            sessionStatus: 'authenticated',
            isAuthenticated: true, // Update reactive authentication state
            isLoading: false,
            error: null,
            logoutReason: null // Clear any previous logout reason
          });

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login error';
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          console.error('❌ [AUTH STORE] Login exception:', error);
          
          set({
            error: errorMessage,
            isLoading: false
          });
          return false;
        }
      },

      /**
       * Register new user account
       */
      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.register({ username, password });

          // AuthService now returns AuthResponse directly (not wrapped in success object)
          // Set tokens in session manager
          sessionManager.setTokens(result.tokens);

          // Update store state
          set({
            user: {
              ...result.user,
              lastActivity: new Date().toISOString() // Ensure lastActivity is set
            },
            tokens: result.tokens,
            sessionStatus: 'authenticated',
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration error';
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          console.error('❌ [AUTH STORE] Registration exception:', error);

          set({
            error: errorMessage,
            isLoading: false
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
            sessionManager.setTokens(result.tokens);

            set({
              user: {
                ...result.user,
                lastActivity: new Date().toISOString()
              },
              tokens: result.tokens,
              sessionStatus: 'authenticated',
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            return {
              success: true,
              status: 'approved',
              message: result.message
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
              error: null
            });

            return {
              success: true,
              status: 'pending',
              message: result.message
            };
          }

          // Unexpected state
          throw new Error('Invalid registration response status');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration error';
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          console.error('❌ [AUTH STORE] registerWithResearcher exception:', error);

          set({
            error: errorMessage,
            isLoading: false
          });

          return {
            success: false,
            message: errorMessage
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
              lastActivity: new Date().toISOString() // Ensure lastActivity is set
            },
            tokens: sessionManager.getTokens(),
            sessionStatus: 'authenticated',
            error: null
          });
          return true;
        } catch (error) {
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          console.error('❌ [AUTH STORE] Session verification error:', error);
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
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          console.error('❌ [AUTH STORE] First time check failed:', error);
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
          // eslint-disable-next-line no-console -- Warning logging for production monitoring
          console.warn('⚠️ [AUTH STORE] Backend logout failed (clearing local session anyway):', error);
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
       */
      initializeFromStorage: () => {
        const tokens = sessionManager.getTokens();
        const user = sessionStorage.getUser();

        if (tokens && user) {
          set({
            user,
            tokens,
            sessionStatus: sessionManager.getSessionStatus()
          });
        } else {
          set({ sessionStatus: 'unauthenticated' });
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
          error: null
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
          logoutReason: reason
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
            error: storeState.error
          },
          sessionManager: sessionDebug
        };
      }
    }),
    {
      name: 'odysseus-auth-enhanced',
      
      // Only persist user data, tokens handled by SessionManager
      partialize: (state) => ({
        user: state.user
      }),
      
      // Initialize session manager on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Let SessionManager handle token restoration
          const authStore = useAuthStore.getState();
          authStore.initializeFromStorage();
        }
      }
    }
  )
);

// Export session manager for HTTP client integration
export { sessionManager };

// Development-only global debugging (removed in production builds)
if (env.isDev()) {
  (globalThis as any).__ODYSSEUS_SESSION_DEBUG__ = () => {
    const authState = useAuthStore.getState();
    return authState.getDebugInfo();
  };
}
