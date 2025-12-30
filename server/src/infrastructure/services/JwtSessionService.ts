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
import { SessionService, SessionValidationResult, SessionValidationOutcome } from '@application/commands/UserCommands';
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
import type { SecurityConfig } from '@odysseus/shared-schemas';

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

  // SecurityConfig caching (60s TTL to reduce DB hits)
  private securityConfigCache: SecurityConfig | null = null;
  private securityConfigCacheTime: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 60 seconds

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
   * Get cached security configuration (60s TTL)
   * Reduces database hits for frequently accessed security settings
   */
  private async getCachedSecurityConfig(): Promise<SecurityConfig> {
    const now = Date.now();
    if (this.securityConfigCache && (now - this.securityConfigCacheTime) < this.CACHE_TTL_MS) {
      return this.securityConfigCache;
    }

    this.securityConfigCache = await this.configurationRepository.getSecurityConfig();
    this.securityConfigCacheTime = now;
    return this.securityConfigCache;
  }

  /**
   * Get access token expiry in seconds from security configuration
   * Reads accessTokenExpiryMinutes from admin security settings
   *
   * NOTE: This is separate from sessionTimeoutMinutes (idle timeout).
   * - accessTokenExpiryMinutes: How long the JWT is valid (typically 15 min)
   * - sessionTimeoutMinutes: How long until idle user is logged out
   */
  private async getAccessTokenExpirySeconds(): Promise<number> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    return securityConfig.accessTokenExpiryMinutes * 60; // Convert minutes to seconds
  }

  /**
   * Get access token expiry in milliseconds from security configuration
   * Used for calculating Date objects
   */
  private async getAccessTokenExpiryMilliseconds(): Promise<number> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    return securityConfig.accessTokenExpiryMinutes * 60 * 1000; // Convert minutes to milliseconds
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

  async validateSession(token: string): Promise<SessionValidationResult | null> {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm]
      }) as AccessTokenPayload; // OAuth 2.0 access token payload

      // OAuth 2.0: Use standard 'sub' field (RFC 7519)
      const userId = decoded.sub;
      const sessionId = decoded.sessionId;

      // Validate user ID exists
      if (!userId) {
        console.error(`❌ [${this.instanceId}] No user ID found in token 'sub' field`);
        return null;
      }

      // Validate session ID exists
      if (!sessionId) {
        console.error(`❌ [${this.instanceId}] No session ID found in token payload`);
        return null;
      }

      // Query database for current user state
      // Ensures disabled users can't authenticate and permissions are current
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return null;
      }

      return {
        user,
        sessionId
      };

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

  /**
   * Validate session with full timeout checks and optional activity update
   *
   * @param token - JWT access token
   * @param options.updateActivity - Whether to update lastUsedAt (default: true)
   *   - true: Normal requests (user doing real work)
   *   - false: Status checks like /session-info (polling shouldn't extend session)
   */
  async validateSessionWithActivity(
    token: string,
    options: { updateActivity?: boolean } = {}
  ): Promise<SessionValidationOutcome> {
    const { updateActivity = true } = options;

    // 1. Validate JWT (existing logic)
    const jwtResult = await this.validateSession(token);
    if (!jwtResult) {
      return { success: false, code: 'INVALID_TOKEN' };
    }

    // 2. Fetch session from database
    const session = await this.userSessionRepository.findById(jwtResult.sessionId);
    if (!session || !session.isActive) {
      return { success: false, code: 'SESSION_REVOKED' };
    }

    // 3. Get cached security config
    const config = await this.getCachedSecurityConfig();

    // 4. Check absolute timeout (session age from creation)
    const absoluteTimeoutMs = config.absoluteSessionTimeoutHours * 60 * 60 * 1000;
    if (Date.now() - session.createdAt.getTime() > absoluteTimeoutMs) {
      await this.userSessionRepository.revokeSession(session.id);
      return { success: false, code: 'SESSION_ABSOLUTE_TIMEOUT' };
    }

    // 5. Check idle timeout (time since last activity)
    const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    if (Date.now() - session.lastUsedAt.getTime() > idleTimeoutMs) {
      await this.userSessionRepository.revokeSession(session.id);
      return { success: false, code: 'SESSION_IDLE_TIMEOUT' };
    }

    // 6. Update lastUsedAt ONLY if this is real activity (not a status check)
    if (updateActivity) {
      await this.userSessionRepository.updateLastUsed(session.id, new Date());
    }

    return {
      success: true,
      user: jwtResult.user,
      sessionId: jwtResult.sessionId
    };
  }

  /**
   * Revoke session and associated refresh token
   */
  async revokeSession(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.config.secret) as SessionPayload;

      // Fetch session FIRST to get refreshToken before revoking
      const session = await this.userSessionRepository.findById(decoded.sessionId);
      const refreshTokenValue = session?.refreshToken;

      // Revoke session in database
      await this.userSessionRepository.revokeSession(decoded.sessionId);

      // Revoke associated refresh token (using value we fetched before revoke)
      if (refreshTokenValue) {
        const refreshToken = await this.refreshTokenRepository.findByToken(refreshTokenValue);
        if (refreshToken) {
          refreshToken.revoke();
          await this.refreshTokenRepository.save(refreshToken);
        }
      }

      console.log(`[${this.instanceId}] Session ${decoded.sessionId} revoked`);
    } catch (error) {
      // Token already invalid or session not found
      console.warn(`[${this.instanceId}] Could not revoke session:`, error);
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

    // Get configurable token expiry from security settings
    const accessTokenExpiryMs = await this.getAccessTokenExpiryMilliseconds();
    const refreshTokenExpiry = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    // Create long-lived refresh token (secure random)
    const refreshToken = await this.createRefreshToken(user);

    // Create user session FIRST - its ID will be embedded in the JWT
    // This ensures JWT sessionId matches the database UserSession.id
    const userSession = UserSession.create(
      user.id,
      refreshToken.token,
      refreshTokenExpiry,
      deviceInfo,
      ipAddress,
      userAgent
    );

    try {
      await this.userSessionRepository.save(userSession);
      console.log(`[${this.instanceId}] Created session ${userSession.id} for user ${user.username}`);
    } catch (error) {
      console.error(`[${this.instanceId}] Failed to create user session:`, error);
      throw new Error('Failed to create user session - login aborted');
    }

    // Create short-lived access token (JWT) with session ID
    // The sessionId in the JWT now matches the UserSession.id in the database
    const accessToken = await this.createAccessToken(user, userSession.id);

    // Token expiry times (configurable from admin settings)
    const accessTokenExpiry = new Date(Date.now() + accessTokenExpiryMs);

    // Get cached security config for session timeout settings
    const securityConfig = await this.getCachedSecurityConfig();

    const tokenPair: TokenPair = {
      accessToken,
      refreshToken: refreshToken.token,
      accessTokenExpiry,
      refreshTokenExpiry,
      tokenType: 'Bearer',
      lastActivityTime: new Date(),
      sessionTimeoutMinutes: securityConfig.sessionTimeoutMinutes,
      idleWarningMinutes: securityConfig.idleWarningMinutes
    };

    return {
      user: user.toPublicData(),
      sessionToken: accessToken, // Backward compatibility
      tokens: tokenPair
    };
  }

  /**
   * Create short-lived access token (JWT)
   *
   * @param user - User to create token for
   * @param sessionId - Database session ID to embed in token (links JWT to UserSession record)
   */
  private async createAccessToken(user: User, sessionId: string): Promise<string> {
    // Get configurable expiry from security settings
    const expirySeconds = await this.getAccessTokenExpirySeconds();
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

      // 6. Find the UserSession associated with this refresh token
      const userSession = await this.userSessionRepository.findByRefreshToken(refreshToken);
      if (!userSession) {
        throw new Error('USER_SESSION_NOT_FOUND');
      }

      // NOTE: We intentionally do NOT update lastUsedAt here.
      // Token refresh is automatic maintenance, not user activity.
      // Only real API calls (through auth middleware) should reset idle timeout.

      // 7. Create new access token with session ID (maintains JWT-to-session mapping)
      const newAccessToken = await this.createAccessToken(user, userSession.id);
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
        'USER_NOT_FOUND',
        'USER_SESSION_NOT_FOUND'
      ].includes(error.message)) {
        throw error;
      }

      // Wrap unexpected errors
      throw new Error('TOKEN_REFRESH_FAILED');
    }
  }
}
