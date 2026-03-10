/**
 * Token Types - OAuth 2.0 / JWT Types
 *
 * Implements RFC 6749 OAuth 2.0 for dual token architecture.
 */

import type { User } from '@domain/entities/User';

export interface TokenPair {
  accessToken: string;      // Short-lived JWT (15-30 min)
  refreshToken: string;     // Long-lived secure random (7-30 days)
  accessTokenExpiry: Date;
  refreshTokenExpiry: Date;
  tokenType: 'Bearer';
  lastActivityTime: Date;
  sessionTimeoutMinutes?: number;  // From SecurityConfig
  idleWarningMinutes?: number;     // From SecurityConfig
}

/** Stored in database as refresh_tokens row. */
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date | null;  // null = never used (for analytics)
  isRevoked: boolean;
  deviceFingerprint?: string;
}

export interface AccessTokenPayload {
  // Standard JWT claims (RFC 7519)
  sub: string;              // Subject (user ID)
  iss: string;              // Issuer
  aud: string;              // Audience
  exp: number;              // Expiration time
  iat: number;              // Issued at
  jti: string;              // JWT ID (unique)

  // Custom claims
  sessionId: string;
  username: string;
  role: string;
  labId?: string;
  permissions?: string[];
}

export interface EnhancedLoginResponse {
  user: ReturnType<User['toPublicData']>;
  sessionToken: string;     // Legacy field (populated from accessToken)
  tokens: TokenPair;
}

export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiry: Date;
  tokenType: 'Bearer';
}

export interface TokenConfiguration {
  // Access token settings
  accessTokenExpiry: string;    // e.g. '30m'
  accessTokenSecret: string;

  // Refresh token settings
  refreshTokenExpiry: string;   // e.g. '7d'
  refreshTokenLength: number;   // Bytes (32-64)

  // Security settings
  allowConcurrentSessions: boolean;
  maxConcurrentSessions: number;
  rotateRefreshTokens: boolean; // New refresh token on each renewal
}
