/**
 * Token Types
 *
 * Implements RFC 6749 OAuth 2.0 for dual token architecture.
 */

import type { User } from '@domain/entities/User';

import type { RefreshTokenResponse, TokenPair } from '@odysseus/shared-schemas';
export type { RefreshTokenResponse, TokenPair };

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
  tokens: TokenPair;
}
