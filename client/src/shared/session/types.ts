/**
 * Session Management Types
 *
 * Complete OAuth 2.0 compliant session architecture for frontend.
 * Replaces legacy single-token system with dual-token approach.
 *
 * Architecture:
 * - TokenPair: Persistent state (survives app restart, stored in localStorage)
 * - SessionManager: Ephemeral state (resets on app restart, in-memory only)
 *   - Activity tracking is session-scoped
 *   - Token expiry is persistent
 *
 * This separation ensures:
 * - Idle timeout only applies to active sessions (not stale localStorage)
 * - Token refresh works across app restarts
 * - OAuth 2.0 compliance with proper token lifecycle
 */

/**
 * Token pair from backend (OAuth 2.0)
 *
 * Persistent state that survives app restart (stored in localStorage).
 */
export interface TokenPair {
  accessToken: string; // Short-lived JWT (30 minutes)
  refreshToken: string; // Long-lived secure token (7 days)
  accessTokenExpiry: Date; // When access token expires
  refreshTokenExpiry: Date; // When refresh token expires
  tokenType: 'Bearer'; // OAuth 2.0 Bearer token type
  sessionTimeoutMinutes?: number; // Idle timeout duration (from SecurityConfig)
}

/**
 * Session status for UI state management
 */
export type SessionStatus =
  | 'authenticated' // Valid session, tokens active
  | 'refreshing' // Refreshing expired access token
  | 'expired' // Refresh token expired, login required
  | 'invalid' // Session invalid, login required
  | 'unauthenticated'; // No session, login required

/**
 * Enhanced login response from backend
 */
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    role: string;
  };
  tokens: TokenPair;
}

/**
 * Token refresh response from backend
 */
export interface RefreshResponse {
  accessToken: string;
  accessTokenExpiry: Date;
  tokenType: 'Bearer';
}

/**
 * Session manager configuration
 */
export interface SessionConfig {
  refreshBufferMinutes: number; // Refresh token N minutes before expiry (default: 5)
  maxRetries: number; // Max refresh attempts (default: 3)
  retryDelayMs: number; // Delay between retries (default: 1000)
}

/**
 * Session manager state
 */
export interface SessionManagerState {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  refreshAttempts: number;
  nextRefreshTime: Date | null;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  isValid: boolean;
  expiresIn: number; // Milliseconds until expiry
  needsRefresh: boolean; // True if should refresh soon
}

/**
 * Session persistence interface
 */
export interface SessionStorage {
  getTokens(): TokenPair | null;
  setTokens(tokens: TokenPair): void;
  clearTokens(): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic user data structure from session storage
  getUser(): any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic user data structure for session storage
  setUser(user: any): void;
  clearUser(): void;
}

/**
 * Session error types
 */
export interface SessionError {
  code: string;
  message: string;
  retryable: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic error details with varying structure
  details?: any;
}

/**
 * Session manager events
 */
export type SessionEvent =
  | { type: 'token_refreshed'; tokens: TokenPair }
  | { type: 'token_refresh_failed'; error: SessionError }
  | { type: 'session_expired' }
  | { type: 'session_invalid' }
  | { type: 'logout' };

/**
 * HTTP client token injection interface
 */
export interface TokenProvider {
  getValidAccessToken(): Promise<string | null>;
  isAuthenticated(): boolean;
  getSessionStatus(): SessionStatus;
}
