/**
 * Session Service
 *
 * OAuth 2.0 session lifecycle with automatic token refresh and idle timeout monitoring.
 */

import { logger } from '@infra/logger';
import { env } from '@shared/config';

import type { SessionDebugInfo } from '@domains/authentication/types/debugTypes';
import type { SessionHttpClient } from '@infra/api/SessionHttpClient';
import type { SessionInfoResponse } from '@odysseus/shared-schemas';
import type {
  TokenPair,
  SessionStatus,
  SessionConfig,
  SessionServiceState,
  TokenValidation,
  SessionStorage,
  TokenProvider,
} from '@shared/types/sessionTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface SessionWarningCallbacks {
  showWarning: (config: {
    timeRemainingMs: number;
    onStayLoggedIn: () => void;
    onLogout: (reason: 'manual' | 'timeout') => void;
  }) => void;
  updateWarning: (timeRemainingMs: number) => void;
  hideWarning: () => void;
}

const POLLING_INTERVAL_NORMAL_MS = 30_000; // when far from warning
const POLLING_INTERVAL_APPROACHING_MS = 10_000; // when approaching warning
const POLLING_INTERVAL_WARNING_MS = 5_000; // when warning is shown

// Balances server load vs. UX responsiveness for idle timeout reset
const HEARTBEAT_DEBOUNCE_MS = 30 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

export class SessionService implements TokenProvider {
  private state: SessionServiceState = {
    isRefreshing: false,
    lastRefreshTime: null,
    nextRefreshTime: null,
  };

  private refreshTimer?: NodeJS.Timeout;
  private refreshPromise?: Promise<boolean>;
  private sessionInfoPollingTimer?: NodeJS.Timeout;
  private config: SessionConfig;
  private onSessionExpired?: (reason: 'idle_timeout' | 'token_expired' | 'manual_logout') => void;
  private warningCallbacks?: SessionWarningCallbacks;
  private isWarningShown = false;

  // Activity tracking state
  private isTrackingActivity = false;
  private lastHeartbeatTime = 0;
  private lastKnownTimeUntilTimeout?: number;
  private lastKnownWarningThresholdMs?: number;
  private boundActivityHandler?: () => void;

  // Tracks whether server has confirmed authentication in this app instance (page load)
  // Used to distinguish "session expired while here" vs "session already expired on arrival"
  private hasConfirmedAuth = false;

  constructor(
    private sessionHttpClient: SessionHttpClient,
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
   * Single point of token access. Automatically refreshes expired tokens,
   * eliminating the need for HTTP 401 retry handlers.
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

  getSessionStatus(): SessionStatus {
    if (this.state.isRefreshing) {
      return 'refreshing';
    }

    const tokens = this.storage.getTokens();
    if (!tokens) {
      return 'unauthenticated';
    }

    if (tokens.refreshTokenExpiry <= new Date()) {
      return 'expired';
    }

    // Access token expired but refresh token valid — we can still refresh
    return 'authenticated';
  }

  validateTokens(tokens: TokenPair): TokenValidation {
    const now = Date.now();
    const expiresIn = tokens.accessTokenExpiry.getTime() - now;

    return {
      isValid: expiresIn > 60000, // Valid if more than 1 minute remaining
      expiresIn,
    };
  }

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
      this.refreshPromise = undefined;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      logger.error('No tokens available for refresh');
      return false;
    }

    // Check if refresh token is still valid
    if (tokens.refreshTokenExpiry <= new Date()) {
      logger.error('Refresh token expired');
      const reason = this.hasConfirmedAuth ? 'token_expired' : 'manual_logout';
      this.clearSession(reason);
      return false;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.sessionHttpClient.post('/public/auth/refresh', {
          refreshToken: tokens.refreshToken,
        });

        if (response.success) {
          const refreshData = response.data;

          if (!refreshData.accessToken || !refreshData.accessTokenExpiry) {
            throw new Error('Invalid refresh response format');
          }

          // SessionHttpClient returns raw JSON — coerce date string manually since there's no Zod layer
          const updatedTokens: TokenPair = {
            ...tokens,
            accessToken: refreshData.accessToken,
            accessTokenExpiry: new Date(refreshData.accessTokenExpiry),
          };

          this.setTokens(updatedTokens);
          this.state.lastRefreshTime = new Date();

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
    const reason = this.hasConfirmedAuth ? 'token_expired' : 'manual_logout';
    this.clearSession(reason);
    return false;
  }

  getTokens(): TokenPair | null {
    return this.storage.getTokens();
  }

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
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
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
    this.stopTimersAndTracking();

    // Token storage only - user data cleared by Zustand auth store
    this.storage.clearTokens();

    this.state = {
      isRefreshing: false,
      lastRefreshTime: null,
      nextRefreshTime: null,
    };

    this.hasConfirmedAuth = false;

    this.onSessionExpired?.(reason);
  }

  private stopTimersAndTracking(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
      this.sessionInfoPollingTimer = undefined;
    }

    this.stopActivityTracking();

    if (this.isWarningShown) {
      this.warningCallbacks?.hideWarning();
      this.isWarningShown = false;
    }

    this.refreshPromise = undefined;
    this.lastKnownTimeUntilTimeout = undefined;
    this.lastKnownWarningThresholdMs = undefined;
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
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
      this.sessionInfoPollingTimer = undefined;
    }

    void this.pollSessionInfo();
  }

  private calculatePollingInterval(): number {
    // If warning is shown, poll frequently for accurate countdown
    if (this.isWarningShown) {
      return POLLING_INTERVAL_WARNING_MS;
    }

    // Poll faster when within 2x the server-configured warning threshold
    if (
      this.lastKnownTimeUntilTimeout !== undefined &&
      this.lastKnownWarningThresholdMs !== undefined &&
      this.lastKnownTimeUntilTimeout <= this.lastKnownWarningThresholdMs * 2
    ) {
      return POLLING_INTERVAL_APPROACHING_MS;
    }

    return POLLING_INTERVAL_NORMAL_MS;
  }

  private scheduleNextPoll(): void {
    if (this.sessionInfoPollingTimer) {
      clearTimeout(this.sessionInfoPollingTimer);
    }

    const interval = this.calculatePollingInterval();

    this.sessionInfoPollingTimer = setTimeout(() => {
      void this.pollSessionInfo();
    }, interval);
  }

  private async pollSessionInfo(): Promise<void> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return;
    }

    try {
      const response = await this.sessionHttpClient.get<ApiEnvelope<SessionInfoResponse>>(
        '/public/auth/session-info',
        { Authorization: `Bearer ${tokens.accessToken}` }
      );

      if (!response.success) {
        logger.debug('Session info poll: response not successful');
        this.scheduleNextPoll();
        return;
      }

      const data = response.data;

      // Track server-sent timing for adaptive polling
      if (data.timeUntilIdleTimeoutMs !== undefined) {
        this.lastKnownTimeUntilTimeout = data.timeUntilIdleTimeoutMs;
      }
      if (data.idleWarningMinutes !== undefined) {
        this.lastKnownWarningThresholdMs = data.idleWarningMinutes * 60 * 1000;
      }

      // Session no longer authenticated - server may have logged us out
      if (!data.isAuthenticated) {
        logger.debug('Session no longer authenticated', { reason: data.reason });
        // Only show timeout banner if session expired while user was actively using the app
        const reason = this.hasConfirmedAuth ? 'idle_timeout' : 'manual_logout';
        this.clearSession(reason);
        return;
      }

      // Mark that we've confirmed authentication in this app instance
      this.hasConfirmedAuth = true;

      if (data.showWarning && data.timeUntilIdleTimeoutMs !== undefined) {
        if (!this.isWarningShown && this.warningCallbacks) {
          this.isWarningShown = true;
          this.warningCallbacks.showWarning({
            timeRemainingMs: data.timeUntilIdleTimeoutMs,
            onStayLoggedIn: () => {
              void this.sendHeartbeat();
            },
            onLogout: (reason: 'manual' | 'timeout') => {
              const sessionReason = reason === 'timeout' ? 'idle_timeout' : 'manual_logout';
              this.clearSession(sessionReason);
            },
          });
        } else if (this.isWarningShown && this.warningCallbacks) {
          this.warningCallbacks.updateWarning(data.timeUntilIdleTimeoutMs);
        }
      } else if (this.isWarningShown) {
        // Session extended by other activity - hide warning
        this.isWarningShown = false;
        this.warningCallbacks?.hideWarning();
      }

      this.scheduleNextPoll();
    } catch (error) {
      // Silently ignore polling errors - we'll retry on next interval
      logger.debug('Session info polling error', { error });
      this.scheduleNextPoll();
    }
  }

  /**
   * Send heartbeat to extend session.
   * Called when user clicks "Stay Logged In" or via debounced activity tracking.
   */
  private async sendHeartbeat(): Promise<boolean> {
    const tokens = this.storage.getTokens();
    if (!tokens) {
      return false;
    }

    try {
      const response = await this.sessionHttpClient.post<ApiEnvelope<unknown>>(
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
        this.lastKnownTimeUntilTimeout = undefined;

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

  private stopActivityTracking(): void {
    if (!this.isTrackingActivity || !this.boundActivityHandler) {
      return;
    }

    // Remove all listeners (must match capture phase from addEventListener)
    ACTIVITY_EVENTS.forEach(event => {
      window.removeEventListener(event, this.boundActivityHandler!, { capture: true });
    });

    this.boundActivityHandler = undefined;
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

  destroy(): void {
    this.stopTimersAndTracking();
  }

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
      lastRefresh: this.state.lastRefreshTime?.toLocaleTimeString() ?? 'Never',
    };
  }
}
