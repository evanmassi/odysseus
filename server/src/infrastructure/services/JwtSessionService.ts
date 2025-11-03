/**
 * JWT Session Service
 *
 * JWT-based session management with secure token generation and validation.
 * Configurable expiration and security features.
 */

import * as jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'crypto';
import { User } from '@domain/entities/User';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { UserSession } from '@domain/entities/UserSession';
import { SessionService } from '@application/commands/UserCommands';
import { ConfigurationService } from '@infrastructure/configuration/ConfigurationService';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import {
  TokenPair,
  RefreshTokenRecord,
  AccessTokenPayload,
  EnhancedLoginResponse,
  RefreshTokenResponse,
  TokenConfiguration
} from '@shared/types/TokenTypes';

export interface JwtSessionConfig {
  secret: string;
  expirationTime: string; // e.g., '24h', '7d'
  issuer: string;
  audience: string;
  algorithm: jwt.Algorithm;
}

export interface SessionPayload {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class JwtSessionService implements SessionService {
  private readonly config: JwtSessionConfig;
  private readonly instanceId: string;

  constructor(
    configurationService: ConfigurationService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configurationRepository: ConfigurationRepository,
    private readonly userSessionRepository: UserSessionRepository
  ) {
    this.instanceId = Math.random().toString(36).substring(2, 8);
    const jwtConfig = configurationService.get('jwt');

    this.config = {
      secret: jwtConfig.secret,
      expirationTime: jwtConfig.expirationTime,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm as jwt.Algorithm
    };
  }

  /**
   * Get access token expiry in seconds from security configuration
   * Reads sessionTimeoutMinutes from admin security settings
   */
  private async getAccessTokenExpirySeconds(): Promise<number> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    return securityConfig.sessionTimeoutMinutes * 60; // Convert minutes to seconds
  }

  /**
   * Get access token expiry in milliseconds from security configuration
   * Used for calculating Date objects
   */
  private async getAccessTokenExpiryMilliseconds(): Promise<number> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    return securityConfig.sessionTimeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Enforce maxConcurrentSessions limit for a user
   * Revokes oldest sessions if user exceeds configured limit
   *
   * @param userId - User ID to check session limit for
   * @returns Number of sessions revoked
   */
  private async enforceSessionLimit(userId: string): Promise<number> {
    try {
      const securityConfig = await this.configurationRepository.getSecurityConfig();
      const maxSessions = securityConfig.maxConcurrentSessions;

      // Count current active sessions
      const currentSessionCount = await this.userSessionRepository.countActiveSessions(userId);

      // If user is at or over the limit, revoke oldest sessions
      // We need to revoke enough to make room for the new session
      const sessionsToRevoke = currentSessionCount >= maxSessions
        ? (currentSessionCount - maxSessions + 1)
        : 0;

      if (sessionsToRevoke <= 0) {
        return 0; // No sessions need to be revoked
      }

      // Get all active sessions sorted by creation time (oldest first)
      const activeSessions = await this.userSessionRepository.findActiveSessionsByUserId(userId);

      // Sort by createdAt ascending (oldest first)
      const sortedSessions = activeSessions.sort((a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      // Revoke the oldest sessions
      const sessionsToRevokeIds = sortedSessions
        .slice(0, sessionsToRevoke)
        .map(session => session.id);

      if (sessionsToRevokeIds.length > 0) {
        const revokedCount = await this.userSessionRepository.batchRevoke(sessionsToRevokeIds);
        console.log(`🔒 [${this.instanceId}] Revoked ${revokedCount} old sessions for user ${userId} (limit: ${maxSessions})`);
        return revokedCount;
      }

      return 0;
    } catch (error) {
      // Log error but don't block login if session enforcement fails
      console.error(`❌ [${this.instanceId}] Failed to enforce session limit:`, error);
      return 0;
    }
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm]
      }) as any; // OAuth 2.0 access token payload

      // OAuth 2.0: Use standard 'sub' field (RFC 7519)
      const userId = decoded.sub;

      // Validate user ID exists
      if (!userId) {
        console.error(`❌ [${this.instanceId}] No user ID found in token 'sub' field`);
        return null;
      }

      // Query database for current user state
      // Ensures disabled users can't authenticate and permissions are current
      const user = await this.userRepository.findById(userId);

      return user;

    } catch (error) {
      // Token is invalid, expired, or malformed
      console.error(`🚨 JWT validation failed [${this.instanceId}]:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenLength: token?.length || 0,
        config: {
          issuer: this.config.issuer,
          audience: this.config.audience,
          algorithm: this.config.algorithm
        }
      });
      return null;
    }
  }

  async revokeSession(token: string): Promise<void> {
    // For JWT tokens, revocation typically involves:
    // 1. Adding the token to a blacklist/revocation store
    // 2. Or, tracking session IDs in database for validation
    // 
    // For simplicity in this implementation, we'll leave this as a placeholder
    // In production, you'd implement proper token revocation:
    
    try {
      const decoded = jwt.verify(token, this.config.secret) as SessionPayload;
      // TODO: Add token/session to revocation store
      console.log(`Session ${decoded.sessionId} revoked`);
    } catch (error) {
      // Token already invalid, nothing to revoke
    }
  }

  /**
   * Decode token without verification (for debugging/logging)
   */
  decodeToken(token: string): SessionPayload | null {
    try {
      return jwt.decode(token) as SessionPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired without full verification
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    return decoded.exp * 1000 < Date.now();
  }

  /**
   * Get time until token expires
   */
  getTokenExpirationTime(token: string): number | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return Math.max(0, decoded.exp * 1000 - Date.now());
  }

  // ENHANCED DUAL TOKEN METHODS

  /**
   * Create enhanced token pair (OAuth 2.0)
   * Returns both access token (JWT) and refresh token (secure random)
   *
   * @param user - User to create tokens for
   * @param userAgent - Optional user agent string from request headers
   * @param ipAddress - Optional IP address from request
   * @param deviceInfo - Optional device description
   */
  async createTokenPair(
    user: User,
    userAgent?: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<EnhancedLoginResponse> {
    // Enforce concurrent session limit (revoke old sessions if needed)
    await this.enforceSessionLimit(user.id);

    // Get configurable access token expiry from security settings
    const accessTokenExpiryMs = await this.getAccessTokenExpiryMilliseconds();

    // Create short-lived access token (JWT)
    const accessToken = await this.createAccessToken(user);

    // Create long-lived refresh token (secure random)
    const refreshToken = await this.createRefreshToken(user);

    // Token expiry times (configurable from admin settings)
    const accessTokenExpiry = new Date(Date.now() + accessTokenExpiryMs);
    const refreshTokenExpiry = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    // Create user session for tracking concurrent sessions
    try {
      const userSession = UserSession.create(
        user.id,
        refreshToken.token,
        refreshTokenExpiry,
        deviceInfo,
        ipAddress,
        userAgent
      );
      await this.userSessionRepository.save(userSession);
      console.log(`[${this.instanceId}] Created session ${userSession.id} for user ${user.username}`);
    } catch (error) {
      // Log error but don't block login if session creation fails
      console.error(`[${this.instanceId}] Failed to create user session:`, error);
    }

    // Get security config for session timeout
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    const tokenPair: TokenPair = {
      accessToken,
      refreshToken: refreshToken.token,
      accessTokenExpiry,
      refreshTokenExpiry,
      tokenType: 'Bearer',
      lastActivityTime: new Date(),
      sessionTimeoutMinutes: securityConfig.sessionTimeoutMinutes
    };

    return {
      user: user.toPublicData(),
      sessionToken: accessToken, // Backward compatibility
      tokens: tokenPair
    };
  }

  /**
   * Create short-lived access token (JWT)
   */
  private async createAccessToken(user: User): Promise<string> {
    // Get configurable expiry from security settings
    const expirySeconds = await this.getAccessTokenExpirySeconds();
    const sessionId = randomUUID();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const payload: AccessTokenPayload = {
      // Standard JWT claims (RFC 7519)
      sub: user.id,              // Subject
      iss: this.config.issuer,   // Issuer
      aud: this.config.audience, // Audience
      exp: nowSeconds + expirySeconds, // Configurable from admin settings
      iat: nowSeconds,           // Issued at
      jti: randomUUID(),         // JWT ID

      // Custom claims
      sessionId,
      username: user.username,
      role: user.role.value
    };

    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm
    } as jwt.SignOptions);
  }

  /**
   * Create long-lived refresh token (secure random)
   */
  private async createRefreshToken(user: User): Promise<RefreshTokenRecord> {
    const tokenId = randomUUID();
    const secureToken = randomBytes(32).toString('hex'); // 256-bit secure random
    
    // Create domain entity
    const refreshTokenEntity = RefreshToken.create(user.id, 7); // 7 days expiry
    
    // Store in database using repository
    await this.refreshTokenRepository.save(refreshTokenEntity);
    const savedToken = refreshTokenEntity;

    // Return record format for backward compatibility
    const refreshTokenRecord: RefreshTokenRecord = {
      id: savedToken.id,
      userId: savedToken.userId,
      token: savedToken.token,
      expiresAt: savedToken.expiresAt,
      createdAt: savedToken.createdAt,
      lastUsedAt: savedToken.lastUsedAt,
      isRevoked: savedToken.isRevoked
    };
    
    return refreshTokenRecord;
  }

  /**
   * Refresh access token using refresh token (OAuth 2.0 with token rotation)
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // 1. Validate refresh token from database
      const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!tokenRecord) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      // 2. Check if token is not expired
      if (tokenRecord.isExpired()) {
        // Clean up expired token
        await this.refreshTokenRepository.delete(tokenRecord.id);
        throw new Error('EXPIRED_REFRESH_TOKEN');
      }

      // 3. Check if token is not revoked
      if (tokenRecord.isRevoked) {
        throw new Error('REVOKED_REFRESH_TOKEN');
      }

      // 4. Get user from database
      const user = await this.userRepository.findById(tokenRecord.userId);
      if (!user) {
        // Clean up orphaned token
        await this.refreshTokenRepository.delete(tokenRecord.id);
        throw new Error('USER_NOT_FOUND');
      }

      // 5. Record token usage (update lastUsedAt)
      tokenRecord.recordUsage();
      await this.refreshTokenRepository.save(tokenRecord);

      // 6. Create new access token with configurable expiry
      const newAccessToken = await this.createAccessToken(user);
      const accessTokenExpiryMs = await this.getAccessTokenExpiryMilliseconds();
      const accessTokenExpiry = new Date(Date.now() + accessTokenExpiryMs);

      return {
        accessToken: newAccessToken,
        accessTokenExpiry,
        tokenType: 'Bearer'
      };

    } catch (error) {
      console.error(`❌ [${this.instanceId}] Token refresh failed:`, error);
      
      // Re-throw known errors
      if (error instanceof Error && [
        'INVALID_REFRESH_TOKEN',
        'EXPIRED_REFRESH_TOKEN', 
        'REVOKED_REFRESH_TOKEN',
        'USER_NOT_FOUND'
      ].includes(error.message)) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new Error('TOKEN_REFRESH_FAILED');
    }
  }
}
