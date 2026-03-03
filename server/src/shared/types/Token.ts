/**
 * Token Types - OAuth 2.0 / JWT Types
 *
 * Implements RFC 6749 OAuth 2.0 for dual token architecture.
 */

/**
 * Token pair response (OAuth 2.0)
 */
export interface TokenPair {
  accessToken: string;      // Short-lived JWT (15-30 min)
  refreshToken: string;     // Long-lived secure random (7-30 days)
  accessTokenExpiry: Date;  // When access token expires
  refreshTokenExpiry: Date; // When refresh token expires
  tokenType: 'Bearer';      // OAuth 2.0 Bearer token type
  lastActivityTime: Date;   // Last user activity for idle timeout tracking
  sessionTimeoutMinutes?: number;  // Idle timeout duration (from SecurityConfig)
  idleWarningMinutes?: number;     // Warning before idle timeout (from SecurityConfig)
}

/**
 * Refresh token data (stored in database)
 */
export interface RefreshTokenRecord {
  id: string;               // Unique token ID
  userId: string;           // Owner user ID
  token: string;            // Secure random token  
  expiresAt: Date;          // Token expiry
  createdAt: Date;          // Creation timestamp
  lastUsedAt: Date | null;  // Last usage (for analytics)
  isRevoked: boolean;       // Revocation status
  deviceFingerprint?: string; // Optional device tracking
}

/**
 * Access token payload (JWT claims)
 */
export interface AccessTokenPayload {
  // Standard JWT claims (RFC 7519)
  sub: string;              // Subject (user ID)
  iss: string;              // Issuer
  aud: string;              // Audience
  exp: number;              // Expiration time
  iat: number;              // Issued at
  jti: string;              // JWT ID (unique)
  
  // Custom claims
  sessionId: string;        // Session identifier
  username: string;         // User name
  role: string;             // User role
  labId?: string;           // Lab membership (undefined for system_admin)
  permissions?: string[];   // Optional fine-grained permissions
}

/**
 * User public data (from User.toPublicData())
 */
export interface UserPublicData {
  id: string;
  username: string;
  role: 'system_admin' | 'lab_admin' | 'user';
  createdAt: string;
  lastActivity: string;
  status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
  researcherId?: string;
  personId?: string;
  labId?: string;
}

/**
 * Enhanced login response (backward compatible)
 */
export interface EnhancedLoginResponse {
  user: UserPublicData;
  sessionToken: string;     // Legacy field (populated from accessToken)
  tokens: TokenPair;        // New token pair
}

/**
 * Token refresh request/response
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiry: Date;
  tokenType: 'Bearer';
}

/**
 * Session configuration
 */
export interface TokenConfiguration {
  // Access token settings
  accessTokenExpiry: string;    // '30m' (30 minutes)
  accessTokenSecret: string;    // JWT signing secret
  
  // Refresh token settings  
  refreshTokenExpiry: string;   // '7d' (7 days)
  refreshTokenLength: number;   // Token length in bytes (32-64)
  
  // Security settings
  allowConcurrentSessions: boolean;
  maxConcurrentSessions: number;
  rotateRefreshTokens: boolean; // New refresh token on each renewal
}
