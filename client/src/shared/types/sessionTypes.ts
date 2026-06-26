/**
 * Session Management Types
 *
 * Dual-token (access + refresh) session architecture types.
 */

import type { TokenPair } from '@odysseus/shared-schemas';
export type { TokenPair };

export type SessionStatus = 'authenticated' | 'refreshing' | 'expired' | 'unauthenticated';

export interface SessionConfig {
  refreshBufferMinutes: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface SessionServiceState {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  nextRefreshTime: Date | null;
}

export interface TokenValidation {
  isValid: boolean;
  expiresInMs: number;
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
