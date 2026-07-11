/**
 * Token Types - OAuth 2.0 / JWT Types
 *
 * Implements RFC 6749 OAuth 2.0 for dual token architecture.
 */

import type { User } from '@domain/entities/User';

import type { TokenPair } from '@odysseus/shared-schemas';
export type { TokenPair };

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
