/**
 * Session Manager
 *
 * Session management with automatic token refresh and server-side session monitoring.
 *
 * Responsibilities:
 * - Automatic access token refresh before expiry
 * - Session state management and validation
 * - Token storage and retrieval
 * - Server-side session info polling (idle timeout warning)
 * - Graceful error handling and retry logic
 * - Session cleanup and logout
 */

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

import type { AuthHttpClient } from '../../infrastructure/api/AuthHttpClient';
import type { SessionDebugInfo } from '@domains/authentication/types/debug';
import type {
  TokenPair,
  SessionStatus,
  SessionConfig,
  SessionManagerState,
  TokenValidation,
  SessionStorage,
  RefreshResponse,
  TokenProvider,
} from '@shared/session/types';

/**
 * Session info response data from server
 */
interface SessionInfoData {
  isAuthenticated: boolean;
  reason?: string;
  timeUntilIdleTimeoutMs?: number;
  showWarning?: boolean;
  idleWarningMinutes?: number;
}

/**
 * API response envelope for session info
 */
interface SessionInfoApiResponse {
  success: boolean;
  data: SessionInfoData;
}

/**
 * API response envelope for heartbeat
 */
interface HeartbeatApiResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
  };
}

/**
 * Callback interface for session warning UI
 */
interface SessionWarningCallbacks {
  showWarning: (config: {
    timeRemainingMs: number;
    onStayLoggedIn: () => void;
    onLogout: (reason: 'manual' | 'timeout') => void;
  }) => void;
  updateWarning: (timeRemainingMs: number) => void;
  hideWarning: () => void;
}

/**
 * Session Manager - OAuth 2.0 Session Lifecycle Management
 *
 * ARCHITECTURE:
 * - Persistent State: Tokens stored via SessionStorage (localStorage)
 * - Ephemeral State: Refresh timers, polling intervals (in-memory only)
 *
 * Session Monitoring:
 * - Server-side idle timeout enforcement (server tracks lastUsedAt)
 * - Client polls /session-info to detect warning threshold
 * - Warning modal shown when timeUntilIdleTimeoutMs <= idleWarningMinutes
 * - Heartbeat endpoint extends session when user clicks "Stay Logged In"
 *
 * Token Management:
 * - Access token: Short-lived, auto-refreshes
 * - Refresh token: Long-lived, persists across restarts
 */
// Polling intervals for adaptive session monitoring
const POLLING_INTERVAL_NORMAL_MS = 30000; // 30 seconds when far from warning
const POLLING_INTERVAL_APPROACHING_MS = 10000; // 10 seconds when approaching warning
const POLLING_INTERVAL_WARNING_MS = 5000; // 5 seconds when warning is shown

// Activity tracking: debounce heartbeat to max 1 per 30 seconds
// Balances server load vs. UX responsiveness for idle timeout reset
const HEARTBEAT_DEBOUNCE_MS = 30 * 1000;

// Events that indicate user activity
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

export class SessionManager implements TokenProvider {
  private state: SessionManagerState = {
    isRefreshing: false,
    lastRefreshTime: null,
    refreshAttempts: 0,
    nextRefreshTime: null,
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private sessionInfoPollingTimer: NodeJS.Timeout | null = null;
  private config: SessionConfig;
  private onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void;
  private warningCallbacks?: SessionWarningCallbacks;
  private isWarningShown: boolean = false;

  // Activity tracking state
  private isTrackingActivity: boolean = false;
  private lastHeartbeatTime: number = 0;
  private lastKnownTimeUntilTimeout: number | null = null;
  private boundActivityHandler: (() => void) | null = null;

  constructor(
    private authHttpClient: AuthHttpClient,
    private storage: SessionStorage,
    onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void,
    config?: Partial<SessionConfig>,
    warningCallbacks?: SessionWarningCallbacks
  ) {
    this.onSessionExpired = onSessionExpired;
    this.warningCallbacks = warningCallbacks;
    this.config = {
      refreshBufferMinutes: 5,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    };

    // Restore token refresh schedule on page reload
    // When the app reloads, tokens are loaded from localStorage but the
    // refresh timer is not set. This ensures tokens refresh automatically.
    const existingTokens = this.storage.getTokens();
    if (existingTokens) {
      this.scheduleTokenRefresh(existingTokens.accessTokenExpiry);
      // Start server-side session monitoring and activity tracking
      this.startSessionInfoPolling();
      this.startActivityTracking();
    }
  }

  /**
   * Set warning callbacks for session timeout UI
   * Called after modalStore is initialized
   */
  setWarningCallbacks(callbacks: SessionWarningCallbacks): void {
    this.warningCallbacks = callbacks;
  }

  /**
   * Get valid access token with automatic refresh
   *
   * Single point of token management.
   * Automatically refreshes expired tokens, eliminating the need for HTTP 401 handlers.
   *
   * NOTE: Idle timeout is now enforced server-side. The server checks lastUsedAt
   * on each request and returns appropriate error codes.
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return null;
    }

    const validation = this.validateTokens(tokens);

    // Return valid token immediately
    if (validation.isValid) {
      return tokens.accessToken;
    }

    // Auto-refresh expired tokens
    const refreshSuccess = await this.refreshTokens();

    if (refreshSuccess) {
      const newTokens = this.storage.getTokens();
      return newTokens?.accessToken ?? null;
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
      needsRefresh: expiresIn <= bufferMs, // Refresh if within buffer time
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
      logger.error('No tokens available for refresh');
      return false;
    }

    // Check if refresh token is still valid
    if (tokens.refreshTokenExpiry <= new Date()) {
      logger.error('Refresh token expired');
      this.clearSession();
      return false;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.authHttpClient.post('/public/auth/refresh', {
          refreshToken: tokens.refreshToken,
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
            accessTokenExpiry: refreshData.accessTokenExpiry,
          };

          this.setTokens(updatedTokens);
          this.state.lastRefreshTime = new Date();
          this.state.refreshAttempts = 0;

          return true;
        } else {
          throw new Error('Refresh request failed');
        }
      } catch (error) {
        logger.error(`Token refresh attempt ${attempt} failed`, { error, attempt });

        if (attempt < this.config.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retry attempts failed
    logger.error('Token refresh failed after all retry attempts');
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
    // Start server-side session monitoring and activity tracking
    this.startSessionInfoPolling();
    this.startActivityTracking();
  }

  /**
   * Schedule automatic token refresh
   *
   * Uses dynamic buffer calculation to prevent refresh loops when
   * sessionTimeoutMinutes is short (e.g., 5 minutes for testing).
   */
  scheduleTokenRefresh(accessTokenExpiry: Date): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const now = Date.now();
    const tokenLifetimeMs = accessTokenExpiry.getTime() - now;

    // Dynamic buffer: use configured buffer OR 20% of token lifetime, whichever is smaller
    // This prevents refresh loops when sessionTimeoutMinutes <= refreshBufferMinutes
    const configuredBufferMs = this.config.refreshBufferMinutes * 60 * 1000;
    const dynamicBufferMs = Math.floor(tokenLifetimeMs * 0.2); // 20% of token lifetime
    const bufferMs = Math.min(configuredBufferMs, dynamicBufferMs);

    const refreshTime = accessTokenExpiry.getTime() - bufferMs;
    const delay = Math.max(0, refreshTime - now);

    // Minimum delay of 10 seconds to prevent rapid refresh loops
    const MIN_REFRESH_DELAY_MS = 10000;
    const safeDelay = Math.max(delay, MIN_REFRESH_DELAY_MS);

    this.state.nextRefreshTime = new Date(now + safeDelay);

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens().catch(error => {
        logger.error('Automatic token refresh failed', { error });
      });
    }, safeDelay);
  }

  /**
   * Clear session and logout
   *
   * Clears only tokens. User data is cleared by auth store's clearAuth().
   *
   * @param reason - Why the session is being cleared (for UX messaging)
   */
  clearSession(reason: 'idle_timeout' | 'token_expired' | 'manual_logout' = 'manual_logout'): void {
    // Clear timers
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Stop session info polling
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
      this.sessionInfoPollingTimer = null;
    }

    // Stop activity tracking
    this.stopActivityTracking();

    // Hide warning modal if shown
    if (this.isWarningShown) {
      this.warningCallbacks?.hideWarning();
      this.isWarningShown = false;
    }

    // Clear token storage (user cleared by Zustand auth store)
    this.storage.clearTokens();

    // Reset state
    this.state = {
      isRefreshing: false,
      lastRefreshTime: null,
      refreshAttempts: 0,
      nextRefreshTime: null,
    };

    this.refreshPromise = null;
    this.lastKnownTimeUntilTimeout = null;

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
   * Start background session info polling with adaptive intervals
   *
   * Polling frequency adjusts based on proximity to idle timeout:
   * - Normal: 30 seconds (when far from warning threshold)
   * - Approaching: 10 seconds (within 2x warning time)
   * - Warning shown: 5 seconds (for accurate countdown)
   */
  private startSessionInfoPolling(): void {
    // Stop any existing polling
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
      this.sessionInfoPollingTimer = null;
    }

    // Poll immediately on start, then schedule next poll
    void this.pollSessionInfo();
  }

  /**
   * Calculate next polling interval based on time until timeout
   */
  private calculatePollingInterval(): number {
    // If warning is shown, poll frequently for accurate countdown
    if (this.isWarningShown) {
      return POLLING_INTERVAL_WARNING_MS;
    }

    // Use last known time from server to determine interval
    if (this.lastKnownTimeUntilTimeout !== null) {
      // If within 2x the warning threshold, poll more frequently
      // Assume 5-minute warning threshold if not specified
      const warningThresholdMs = 5 * 60 * 1000;
      const approachingThreshold = warningThresholdMs * 2;

      if (this.lastKnownTimeUntilTimeout <= approachingThreshold) {
        return POLLING_INTERVAL_APPROACHING_MS;
      }
    }

    return POLLING_INTERVAL_NORMAL_MS;
  }

  /**
   * Schedule the next session info poll
   */
  private scheduleNextPoll(): void {
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
    }

    const interval = this.calculatePollingInterval();

    this.sessionInfoPollingTimer = setTimeout(() => {
      void this.pollSessionInfo();
    }, interval);
  }

  /**
   * Poll server for session status
   */
  private async pollSessionInfo(): Promise<void> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return;
    }

    try {
      const response = await this.authHttpClient.get<SessionInfoApiResponse>(
        '/public/auth/session-info',
        { Authorization: `Bearer ${tokens.accessToken}` }
      );

      if (!response.success) {
        logger.debug('Session info poll: response not successful');
        this.scheduleNextPoll();
        return;
      }

      const data = response.data;

      // Track time until timeout for adaptive polling
      if (data.timeUntilIdleTimeoutMs !== undefined) {
        this.lastKnownTimeUntilTimeout = data.timeUntilIdleTimeoutMs;
      }

      // Session no longer authenticated - server may have logged us out
      if (!data.isAuthenticated) {
        logger.info('Session no longer authenticated', { reason: data.reason });
        this.clearSession('idle_timeout');
        return;
      }

      // Check if warning should be shown
      if (data.showWarning && data.timeUntilIdleTimeoutMs !== undefined) {
        if (!this.isWarningShown && this.warningCallbacks) {
          // Show warning modal
          this.isWarningShown = true;
          this.warningCallbacks.showWarning({
            timeRemainingMs: data.timeUntilIdleTimeoutMs,
            onStayLoggedIn: () => {
              void this.sendHeartbeat();
            },
            onLogout: (reason: 'manual' | 'timeout') => {
              // Map modal reason to session reason
              const sessionReason = reason === 'timeout' ? 'idle_timeout' : 'manual_logout';
              this.clearSession(sessionReason);
            },
          });
        } else if (this.isWarningShown && this.warningCallbacks) {
          // Update countdown
          this.warningCallbacks.updateWarning(data.timeUntilIdleTimeoutMs);
        }
      } else if (this.isWarningShown) {
        // Warning condition no longer met (session extended by other activity)
        this.isWarningShown = false;
        this.warningCallbacks?.hideWarning();
      }

      // Schedule next poll with adaptive interval
      this.scheduleNextPoll();
    } catch (error) {
      // Silently ignore polling errors - we'll retry on next interval
      logger.debug('Session info polling error', { error });
      this.scheduleNextPoll();
    }
  }

  /**
   * Send heartbeat to extend session
   * Called when user clicks "Stay Logged In" or via debounced activity tracking
   */
  async sendHeartbeat(): Promise<boolean> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return false;
    }

    try {
      const response = await this.authHttpClient.post<HeartbeatApiResponse>(
        '/auth/heartbeat',
        {},
        { Authorization: `Bearer ${tokens.accessToken}` }
      );

      if (response.success) {
        // Track when we sent this heartbeat for debouncing
        this.lastHeartbeatTime = Date.now();

        // Hide warning modal if shown
        this.isWarningShown = false;
        this.warningCallbacks?.hideWarning();

        // Reset timeout tracking since session was just extended
        this.lastKnownTimeUntilTimeout = null;

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to send heartbeat', { error });
      return false;
    }
  }

  /**
   * Start tracking user activity to extend session
   *
   * Listens for clicks, keystrokes, mouse movement, scrolling, and touch.
   * Sends debounced heartbeat to extend session on the server.
   */
  private startActivityTracking(): void {
    if (this.isTrackingActivity) {
      return;
    }

    // Create bound handler for cleanup
    this.boundActivityHandler = this.handleUserActivity.bind(this);

    // Add listeners for all activity events
    // Use capture phase so stopPropagation() in component handlers doesn't block us
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, this.boundActivityHandler!, { capture: true, passive: true });
    });

    this.isTrackingActivity = true;
  }

  /**
   * Stop tracking user activity
   */
  private stopActivityTracking(): void {
    if (!this.isTrackingActivity || !this.boundActivityHandler) {
      return;
    }

    // Remove all listeners (must match capture phase from addEventListener)
    ACTIVITY_EVENTS.forEach(event => {
      window.removeEventListener(event, this.boundActivityHandler!, { capture: true });
    });

    this.boundActivityHandler = null;
    this.isTrackingActivity = false;
    this.lastHeartbeatTime = 0;
  }

  /**
   * Handle user activity event
   *
   * Sends debounced heartbeat to extend session server-side.
   * Heartbeats are throttled to max 1 per HEARTBEAT_DEBOUNCE_MS.
   */
  private handleUserActivity(): void {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;

    // Debounce: only send heartbeat if enough time has passed
    if (timeSinceLastHeartbeat < HEARTBEAT_DEBOUNCE_MS) {
      return;
    }

    // Don't send heartbeat if warning is shown (let user explicitly click Stay Logged In)
    if (this.isWarningShown) {
      return;
    }

    // Send heartbeat in background (don't block UI)
    this.lastHeartbeatTime = now; // Set immediately to prevent duplicate calls
    this.sendHeartbeat().catch(error => {
      logger.debug('Activity heartbeat failed', { error });
      // Reset time so we can retry on next activity
      this.lastHeartbeatTime = 0;
    });
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

    // Clear session info polling
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
      this.sessionInfoPollingTimer = null;
    }

    // Stop activity tracking
    this.stopActivityTracking();

    // Hide warning modal if shown
    if (this.isWarningShown) {
      this.warningCallbacks?.hideWarning();
      this.isWarningShown = false;
    }

    this.refreshPromise = null;
    this.lastKnownTimeUntilTimeout = null;
  }

  /**
   * Development-only debugging information
   */
  getDebugInfo(): SessionDebugInfo | { status: string } {
    if (!env.isDev()) {
      return { status: 'Production mode - debug info disabled' };
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
      lastRefresh: this.state.lastRefreshTime?.toLocaleTimeString() ?? 'Never',
    };
  }
}

/**
 * Session storage implementation using localStorage
 *
 * Stores only token state. User data is persisted by Zustand auth store.
 * Activity tracking is not persisted (handled in-memory by SessionManager).
 */
export class LocalStorageSessionStorage implements SessionStorage {
  private readonly TOKENS_KEY = 'odysseus-tokens';

  getTokens(): TokenPair | null {
    try {
      const stored = localStorage.getItem(this.TOKENS_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Parse and validate dates
      const accessTokenExpiry = new Date(parsed.accessTokenExpiry);
      const refreshTokenExpiry = new Date(parsed.refreshTokenExpiry);

      // Validate dates are valid (prevents "Invalid Date" from crashing the app)
      if (isNaN(accessTokenExpiry.getTime()) || isNaN(refreshTokenExpiry.getTime())) {
        logger.warn('Invalid token expiry dates in storage, clearing tokens');
        this.clearTokens();
        return null;
      }

      return {
        ...parsed,
        accessTokenExpiry,
        refreshTokenExpiry,
      };
    } catch (error) {
      logger.error('Failed to parse stored tokens', { error });
      return null;
    }
  }

  setTokens(tokens: TokenPair): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }

  clearTokens(): void {
    localStorage.removeItem(this.TOKENS_KEY);
  }
}
