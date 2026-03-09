/**
 * Authentication Debug Types
 *
 * Interfaces for development-only auth diagnostics.
 */

import type { SessionStatus } from '@shared/types/sessionTypes';

export interface SessionDebugInfo {
  sessionStatus: SessionStatus;
  accessTokenExpiresIn: string;
  nextRefreshIn: string;
  isRefreshing: boolean;
  lastRefresh: string;
}

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
