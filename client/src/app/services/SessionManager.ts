/**
 * Session Manager
 *
 * Session management with automatic token refresh and proactive token renewal.
 *
 * Responsibilities:
 * - Automatic access token refresh before expiry
 * - Session state management and validation
 * - Token storage and retrieval
 * - Graceful error handling and retry logic
 * - Session cleanup and logout
 */

import { env } from '@shared/config';
import { 
  TokenPair, 
  SessionStatus, 
  SessionConfig, 
  SessionManagerState,
  TokenValidation,
  SessionStorage,
  SessionError,
  RefreshResponse,
  TokenProvider
} from '@shared/session/types';
import { AuthHttpClient } from '../../infrastructure/api/AuthHttpClient';

/**
 * Session Manager - OAuth 2.0 Session Lifecycle Management
 *
 * ARCHITECTURE:
 * - Persistent State: Tokens stored via SessionStorage (localStorage)
 * - Ephemeral State: Activity tracking, refresh timers (in-memory only)
 *
 * Activity Tracking:
 * - lastActivityTime: Resets to current time on app load
 * - Idle timeout only applies during active session
 * - Does NOT persist across app restarts (prevents false "Session Timed Out")
 *
 * Token Management:
 * - Access token: Short-lived, auto-refreshes
 * - Refresh token: Long-lived, persists across restarts
 */
export class SessionManager implements TokenProvider {
  private state: SessionManagerState = {
    isRefreshing: false,
    lastRefreshTime: null,
    refreshAttempts: 0,
    nextRefreshTime: null
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private inactivityCheckInterval: NodeJS.Timeout | null = null;
  private config: SessionConfig;
  private onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void;

  /**
   * Ephemeral session state (resets on app restart)
   *
   * Activity tracking is session-scoped, not persisted to localStorage.
   * This prevents false "Session Timed Out" notifications on app load.
   */
  private lastActivityTime: Date = new Date();

  constructor(
    private authHttpClient: AuthHttpClient,
    private storage: SessionStorage,
    onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void,
    config?: Partial<SessionConfig>
  ) {
    this.onSessionExpired = onSessionExpired;
    this.config = {
      refreshBufferMinutes: 5,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config
    };

    // Start background inactivity checker (60 second intervals)
    this.startInactivityChecker();
  }

  /**
   * Get valid access token with automatic refresh
   *
   * Single point of token management.
   * Automatically refreshes expired tokens, eliminating the need for HTTP 401 handlers.
   * Enforces idle timeout based on SecurityConfig.
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return null;
    }

    // Check idle timeout if configured (using in-memory activity tracking)
    if (tokens.sessionTimeoutMinutes) {
      const idleTimeoutMs = tokens.sessionTimeoutMinutes * 60 * 1000;
      const timeSinceLastActivity = Date.now() - this.lastActivityTime.getTime();

      if (timeSinceLastActivity > idleTimeoutMs) {
        // Session timed out due to inactivity
        console.log('⏱️ Session timed out due to inactivity');
        this.clearSession('idle_timeout');
        return null;
      }
    }

    // Update last activity time (this request counts as activity)
    this.lastActivityTime = new Date();

    const validation = this.validateTokens(tokens);

    // Return valid token immediately
    if (validation.isValid) {
      return tokens.accessToken;
    }

    // Auto-refresh expired tokens
    const refreshSuccess = await this.refreshTokens();

    if (refreshSuccess) {
      const newTokens = this.storage.getTokens();
      return newTokens?.accessToken || null;
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const status = this.getSessionStatus();
    return status === 'authenticated' || status === 'refreshing';
  }

  /**
   * Get current session status
   */
  getSessionStatus(): SessionStatus {
    if (this.state.isRefreshing) {
      return 'refreshing';
    }

    const tokens = this.storage.getTokens();
    if (!tokens) {
      return 'unauthenticated';
    }

    const validation = this.validateTokens(tokens);
    
    // Check if refresh token is expired
    if (tokens.refreshTokenExpiry <= new Date()) {
      return 'expired';
    }

    // Check if access token is valid
    if (validation.isValid) {
      return 'authenticated';
    } else {
      // Access token expired but refresh token valid
      return 'authenticated'; // We can refresh it
    }
  }

  /**
   * Validate token pair - Fixed validation logic
   */
  validateTokens(tokens: TokenPair): TokenValidation {
    const now = Date.now();
    const expiresIn = tokens.accessTokenExpiry.getTime() - now;
    const bufferMs = this.config.refreshBufferMinutes * 60 * 1000;

    return {
      isValid: expiresIn > 60000, // Valid if more than 1 minute remaining
      expiresIn,
      needsRefresh: expiresIn <= bufferMs // Refresh if within buffer time
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.state.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.state.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh with retry logic
   */
  private async performTokenRefresh(): Promise<boolean> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      console.error('❌ No tokens available for refresh');
      return false;
    }

    // Check if refresh token is still valid
    if (tokens.refreshTokenExpiry <= new Date()) {
      console.error('❌ Refresh token expired');
      this.clearSession();
      return false;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.authHttpClient.post('/public/auth/refresh', {
          refreshToken: tokens.refreshToken
        });

        if (response.success) {
          const refreshData: RefreshResponse = response.data;

          // Validate refresh response
          if (!refreshData.accessToken || !refreshData.accessTokenExpiry) {
            throw new Error('Invalid refresh response format');
          }

          // Update tokens with new access token
          // HttpClient now automatically transforms dates, so refreshData.accessTokenExpiry is already a Date
          const updatedTokens: TokenPair = {
            ...tokens,
            accessToken: refreshData.accessToken,
            accessTokenExpiry: refreshData.accessTokenExpiry
          };

          this.setTokens(updatedTokens);
          this.state.lastRefreshTime = new Date();
          this.state.refreshAttempts = 0;

          return true;
        } else {
          throw new Error('Refresh request failed');
        }

      } catch (error) {
        console.error(`❌ Token refresh attempt ${attempt} failed:`, error);

        if (attempt < this.config.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retry attempts failed
    console.error('❌ Token refresh failed after all retry attempts');
    this.clearSession();
    return false;
  }

  /**
   * Get current token pair from storage
   */
  getTokens(): TokenPair | null {
    return this.storage.getTokens();
  }

  /**
   * Set new token pair and schedule refresh
   */
  setTokens(tokens: TokenPair): void {
    this.storage.setTokens(tokens);
    this.scheduleTokenRefresh(tokens.accessTokenExpiry);
    // Reset activity time when new tokens are set (fresh session)
    this.lastActivityTime = new Date();
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(accessTokenExpiry: Date): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const now = Date.now();
    const bufferMs = this.config.refreshBufferMinutes * 60 * 1000;
    const refreshTime = accessTokenExpiry.getTime() - bufferMs;
    const delay = Math.max(0, refreshTime - now);

    if (delay > 0) {
      this.state.nextRefreshTime = new Date(now + delay);

      this.refreshTimer = setTimeout(() => {
        this.refreshTokens().catch(error => {
          console.error('❌ Automatic token refresh failed:', error);
        });
      }, delay);
    } else {
      // Trigger immediate refresh
      setTimeout(() => this.refreshTokens(), 0);
    }
  }

  /**
   * Clear session and logout
   *
   * @param reason - Why the session is being cleared (for UX messaging)
   */
  clearSession(reason: 'idle_timeout' | 'token_expired' | 'manual_logout' = 'manual_logout'): void {
    // Clear timers
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    this.storage.clearTokens();
    this.storage.clearUser();

    // Reset state
    this.state = {
      isRefreshing: false,
      lastRefreshTime: null,
      refreshAttempts: 0,
      nextRefreshTime: null
    };

    this.refreshPromise = null;

    // Reset activity time
    this.lastActivityTime = new Date();

    // Notify consumer of session expiration
    this.onSessionExpired?.(reason);
  }

  /**
   * Get session manager state (for debugging)
   */
  getState(): SessionManagerState {
    return { ...this.state };
  }

  /**
   * Get next refresh time (for debugging)
   */
  getNextRefreshTime(): Date | null {
    return this.state.nextRefreshTime;
  }

  /**
   * Start background inactivity checker
   *
   * Checks every 60 seconds if session has exceeded idle timeout.
   */
  private startInactivityChecker(): void {
    // Check every 60 seconds
    this.inactivityCheckInterval = setInterval(() => {
      const tokens = this.storage.getTokens();

      if (!tokens?.sessionTimeoutMinutes) {
        return; // No timeout configured
      }

      const idleTimeoutMs = tokens.sessionTimeoutMinutes * 60 * 1000;
      const timeSinceLastActivity = Date.now() - this.lastActivityTime.getTime();

      if (timeSinceLastActivity > idleTimeoutMs) {
        // Session timed out - clear interval and logout
        console.log('⏱️ [Inactivity Checker] Session timed out due to inactivity');
        this.clearSession('idle_timeout');
      }
    }, 60000); // 60 seconds
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear inactivity checker
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }

    this.refreshPromise = null;
  }

  /**
   * Development-only debugging information
   */
  getDebugInfo(): any {
    if (!env.isDev()) {
      return null;
    }

    const tokens = this.storage.getTokens();
    if (!tokens) {
      return { status: 'No tokens' };
    }

    const validation = this.validateTokens(tokens);
    const timeUntilExpiry = Math.floor(validation.expiresIn / 60000);
    const timeUntilRefresh = this.state.nextRefreshTime 
      ? Math.floor((this.state.nextRefreshTime.getTime() - Date.now()) / 60000)
      : null;

    return {
      sessionStatus: this.getSessionStatus(),
      accessTokenExpiresIn: `${timeUntilExpiry} minutes`,
      nextRefreshIn: timeUntilRefresh ? `${timeUntilRefresh} minutes` : 'Not scheduled',
      isRefreshing: this.state.isRefreshing,
      refreshAttempts: this.state.refreshAttempts,
      lastRefresh: this.state.lastRefreshTime?.toLocaleTimeString() || 'Never'
    };
  }
}

/**
 * Session storage implementation using localStorage
 *
 * Stores persistent token state that survives app restart.
 * Activity tracking is not persisted (handled in-memory by SessionManager).
 */
export class LocalStorageSessionStorage implements SessionStorage {
  private readonly TOKENS_KEY = 'odysseus-tokens';
  private readonly USER_KEY = 'odysseus-user';

  getTokens(): TokenPair | null {
    try {
      const stored = localStorage.getItem(this.TOKENS_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      return {
        ...parsed,
        accessTokenExpiry: new Date(parsed.accessTokenExpiry),
        refreshTokenExpiry: new Date(parsed.refreshTokenExpiry)
      };
    } catch (error) {
      console.error('Failed to parse stored tokens:', error);
      return null;
    }
  }

  setTokens(tokens: TokenPair): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }

  clearTokens(): void {
    localStorage.removeItem(this.TOKENS_KEY);
  }

  getUser(): any | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      return null;
    }
  }

  setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  clearUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }
}
