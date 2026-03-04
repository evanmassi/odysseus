/**
 * Authentication Debug Type Definitions
 *
 * Type-safe debugging interfaces for development-only auth diagnostics.
 * Tree-shaken in production builds.
 */

import type { SessionStatus } from '@shared/session/types';

/**
 * SessionService debug information
 */
export interface SessionDebugInfo {
  sessionStatus: SessionStatus;
  accessTokenExpiresIn: string;
  nextRefreshIn: string;
  isRefreshing: boolean;
  lastRefresh: string;
}

/**
 * AuthStore debug information
 */
export interface AuthDebugInfo {
  storeState: {
    hasUser: boolean;
    hasTokens: boolean;
    sessionStatus: SessionStatus;
    isLoading: boolean;
    error: string | null;
  };
  sessionManager: SessionDebugInfo | { status: string };
}
