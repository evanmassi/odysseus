/**
 * Session Management Types
 *
 * Dual-token (access + refresh) session architecture types.
 *
 * - TokenPair: Persistent state (survives app restart, stored in localStorage)
 * - SessionService: Ephemeral state (resets on app restart, in-memory only)
 *   - Activity tracking is session-scoped
 *   - Token expiry is persistent
 */

import type { TokenPair } from '@odysseus/shared-schemas';
export type { TokenPair };

export type SessionStatus = 'authenticated' | 'refreshing' | 'expired' | 'unauthenticated';

export interface SessionConfig {
  refreshBufferMinutes: number; // Default: 5
  maxRetries: number; // Default: 3
  retryDelayMs: number; // Default: 1000
}

export interface SessionServiceState {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  nextRefreshTime: Date | null;
}

export interface TokenValidation {
  isValid: boolean;
  expiresIn: number; // Milliseconds
}

/**
 * Handles only token storage. User data is persisted by Zustand auth store.
 */
export interface SessionStorage {
  getTokens(): TokenPair | null;
  setTokens(tokens: TokenPair): void;
  clearTokens(): void;
}

export interface TokenProvider {
  getValidAccessToken(): Promise<string | null>;
  getSessionStatus(): SessionStatus;
}
