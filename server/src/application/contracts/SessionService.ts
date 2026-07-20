/**
 * Session Service Contract
 *
 * Interface for session management — token creation and validation.
 */

import type { EnhancedLoginResponse, RefreshTokenResponse } from '@application/types/tokenTypes';
import type { User } from '@domain/entities/User';

export interface SessionValidationResult {
  user: User;
  sessionId: string;
}

export type SessionValidationOutcome =
  | { success: true; user: User; sessionId: string }
  | {
      success: false;
      code:
        | 'INVALID_TOKEN'
        | 'SESSION_REVOKED'
        | 'SESSION_EXPIRED'
        | 'SESSION_IDLE_TIMEOUT'
        | 'SESSION_ABSOLUTE_TIMEOUT'
        | 'LAB_DEACTIVATED';
    };

export interface SessionService {
  validateSession(token: string): Promise<SessionValidationResult | null>;
  createTokenPair(
    user: User,
    userAgent?: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<EnhancedLoginResponse>;
  refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse>;

  /**
   * Validate session with full timeout checks and optional activity update.
   * Used by auth middleware for enforcing idle and absolute timeouts.
   */
  validateSessionWithActivity(
    token: string,
    options?: { updateActivity?: boolean }
  ): Promise<SessionValidationOutcome>;

  /** Short-lived (5 min) token that only allows force-change-password endpoint. */
  createPasswordChangeTempToken(user: User): string;

  /** Returns user ID if valid, null if expired/invalid. */
  verifyPasswordChangeTempToken(
    token: string
  ): Promise<{ userId: string; username: string } | null>;
}
