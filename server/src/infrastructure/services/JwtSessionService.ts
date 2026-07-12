/**
 * JWT Session Management
 *
 * Dual-token (access + refresh) session service with configurable timeouts and demo-aware limits.
 */

import { randomUUID } from 'crypto';

import * as jwt from 'jsonwebtoken';

import type { ConfigurationService } from '@application/contracts/ConfigurationService';
import type { SessionService, SessionValidationResult, SessionValidationOutcome } from '@application/contracts/SessionService';
import type {
  TokenPair,
  RefreshTokenRecord,
  AccessTokenPayload,
  EnhancedLoginResponse,
  RefreshTokenResponse,
} from '@application/types/tokenTypes';
import { RefreshToken } from '@domain/entities/RefreshToken';
import type { User } from '@domain/entities/User';
import { UserSession } from '@domain/entities/UserSession';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { logger } from '@infrastructure/logging/logger';

import type { SecurityConfig } from '@odysseus/shared-schemas';

interface JwtSessionConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: jwt.Algorithm;
}

export class JwtSessionService implements SessionService {
  private readonly config: JwtSessionConfig;

  private securityConfigCache: SecurityConfig | null = null;
  private securityConfigCacheTime: number = 0;
  private readonly CACHE_TTL_MS = 60000;

  private static readonly DEMO_MAX_SESSIONS = 50;
  private static readonly DEMO_SESSION_EXPIRY_HOURS = 4;
  private static readonly REAL_USER_REFRESH_EXPIRY_DAYS = 7;

  constructor(
    configurationService: ConfigurationService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly storageRepository: StorageRepository,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly labRepository?: LabRepository
  ) {
    const jwtConfig = configurationService.get('jwt');

    this.config = {
      secret: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm as jwt.Algorithm
    };
  }

  private async getCachedSecurityConfig(): Promise<SecurityConfig> {
    const now = Date.now();
    if (this.securityConfigCache && (now - this.securityConfigCacheTime) < this.CACHE_TTL_MS) {
      return this.securityConfigCache;
    }

    this.securityConfigCache = await this.storageRepository.getSecurityConfig();
    this.securityConfigCacheTime = now;
    return this.securityConfigCache;
  }

  /**
   * NOTE: accessTokenExpiryMinutes (how long the JWT is valid, typically 15 min)
   * is separate from sessionTimeoutMinutes (how long until idle user is logged out).
   */
  private async getAccessTokenExpiryMs(): Promise<number> {
    const securityConfig = await this.getCachedSecurityConfig();
    return securityConfig.accessTokenExpiryMinutes * 60 * 1000;
  }

  /**
   * Revokes oldest sessions when a user exceeds the concurrent session limit.
   * Demo users have a separate, higher cap not configurable via admin.
   */
  private async enforceSessionLimit(userId: string, isDemo: boolean): Promise<number> {
    try {
      const maxSessions = isDemo
        ? JwtSessionService.DEMO_MAX_SESSIONS
        : (await this.getCachedSecurityConfig()).maxConcurrentSessions;

      const currentSessionCount = await this.userSessionRepository.countActiveSessions(userId);

      const sessionsToRevoke = currentSessionCount >= maxSessions
        ? (currentSessionCount - maxSessions + 1)
        : 0;

      if (sessionsToRevoke <= 0) {
        return 0;
      }

      const activeSessions = await this.userSessionRepository.findActiveSessionsByUserId(userId);

      const sortedSessions = activeSessions.sort((a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      const sessionsToRevokeIds = sortedSessions
        .slice(0, sessionsToRevoke)
        .map(session => session.id);

      if (sessionsToRevokeIds.length > 0) {
        const revokedCount = await this.userSessionRepository.bulkRevoke(sessionsToRevokeIds);
        logger.info(`Revoked ${revokedCount} old sessions for user ${userId} (limit: ${maxSessions})`);
        return revokedCount;
      }

      return 0;
    } catch (error) {
      // Don't block login if session enforcement fails
      logger.error('Failed to enforce session limit:', { error });
      return 0;
    }
  }

  private signToken(payload: object): string {
    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm
    } as jwt.SignOptions);
  }

  private verifyToken<T>(token: string): T {
    return jwt.verify(token, this.config.secret, {
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithms: [this.config.algorithm]
    }) as T;
  }

  async validateSession(token: string): Promise<SessionValidationResult | null> {
    try {
      const decoded = this.verifyToken<AccessTokenPayload>(token);

      // RFC 7519 'sub' claim
      const userId = decoded.sub;
      const sessionId = decoded.sessionId;

      if (!userId) {
        logger.error('No user ID found in token sub field');
        return null;
      }

      if (!sessionId) {
        logger.error('No session ID found in token payload');
        return null;
      }

      // Ensures disabled users can't authenticate and permissions are current
      const user = await this.userRepository.findByIdAnyLab(userId);

      if (!user) {
        return null;
      }

      return { user, sessionId };

    } catch (error) {
      logger.error('JWT validation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenLength: token?.length || 0
      });
      return null;
    }
  }

  /**
   * Validates session with full timeout checks.
   * When updateActivity is false (e.g. status polling), session idle timeout is not extended.
   */
  async validateSessionWithActivity(
    token: string,
    options: { updateActivity?: boolean } = {}
  ): Promise<SessionValidationOutcome> {
    const { updateActivity = true } = options;

    const jwtResult = await this.validateSession(token);
    if (!jwtResult) {
      return { success: false, code: 'INVALID_TOKEN' };
    }

    const session = await this.userSessionRepository.findById(jwtResult.sessionId);
    if (!session || !session.isActive) {
      return { success: false, code: 'SESSION_REVOKED' };
    }

    if (session.isExpired()) {
      await this.userSessionRepository.revokeSession(session.id);
      return { success: false, code: 'SESSION_EXPIRED' };
    }

    const config = await this.getCachedSecurityConfig();

    const absoluteTimeoutMs = config.absoluteSessionTimeoutHours * 60 * 60 * 1000;
    if (Date.now() - session.createdAt.getTime() > absoluteTimeoutMs) {
      await this.userSessionRepository.revokeSession(session.id);
      return { success: false, code: 'SESSION_ABSOLUTE_TIMEOUT' };
    }

    const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    if (Date.now() - session.lastUsedAt.getTime() > idleTimeoutMs) {
      await this.userSessionRepository.revokeSession(session.id);
      return { success: false, code: 'SESSION_IDLE_TIMEOUT' };
    }

    if (this.labRepository && jwtResult.user.labId) {
      const lab = await this.labRepository.findById(jwtResult.user.labId);
      if (lab && !lab.isActive) {
        await this.userSessionRepository.revokeSession(session.id);
        return { success: false, code: 'LAB_DEACTIVATED' };
      }
    }

    // Token refresh is automatic maintenance, not user activity —
    // only real API calls should reset idle timeout
    if (updateActivity) {
      await this.userSessionRepository.updateLastUsed(session.id, new Date());
    }

    return {
      success: true,
      user: jwtResult.user,
      sessionId: jwtResult.sessionId
    };
  }

  async createTokenPair(
    user: User,
    userAgent?: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<EnhancedLoginResponse> {
    await this.enforceSessionLimit(user.id, user.isDemo);

    const accessTokenExpiryMs = await this.getAccessTokenExpiryMs();

    // Demo users get shorter session expiry to prevent accumulation
    const refreshTokenExpiry = user.isDemo
      ? new Date(Date.now() + (JwtSessionService.DEMO_SESSION_EXPIRY_HOURS * 60 * 60 * 1000))
      : new Date(Date.now() + (JwtSessionService.REAL_USER_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000));

    const refreshToken = await this.createRefreshToken(user);

    // Create session FIRST — its ID will be embedded in the JWT
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
      logger.info(`Created session ${userSession.id} for user ${user.username}`);
    } catch (error) {
      logger.error('Failed to create user session:', { error });
      throw new Error('Failed to create user session - login aborted');
    }

    const accessToken = await this.createAccessToken(user, userSession.id);
    const accessTokenExpiry = new Date(Date.now() + accessTokenExpiryMs);

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
      tokens: tokenPair
    };
  }

  /**
   * Creates a short-lived JWT with the database session ID embedded,
   * linking the stateless token to the stateful session record.
   */
  private async createAccessToken(user: User, sessionId: string): Promise<string> {
    const accessTokenExpiryMs = await this.getAccessTokenExpiryMs();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expirySeconds = Math.floor(accessTokenExpiryMs / 1000);

    const payload: AccessTokenPayload = {
      sub: user.id,
      iss: this.config.issuer,
      aud: this.config.audience,
      exp: nowSeconds + expirySeconds,
      iat: nowSeconds,
      jti: randomUUID(),

      sessionId,
      username: user.username,
      role: user.role.value,
      labId: user.labId
    };

    return this.signToken(payload);
  }

  private async createRefreshToken(user: User): Promise<RefreshTokenRecord> {
    // Demo users get shorter refresh token expiry
    const expiryDays = user.isDemo
      ? JwtSessionService.DEMO_SESSION_EXPIRY_HOURS / 24
      : JwtSessionService.REAL_USER_REFRESH_EXPIRY_DAYS;

    const refreshTokenEntity = RefreshToken.create(user.id, expiryDays);
    await this.refreshTokenRepository.save(refreshTokenEntity);

    // RefreshTokenRecord shape expected by callers
    return {
      id: refreshTokenEntity.id,
      userId: refreshTokenEntity.userId,
      token: refreshTokenEntity.token,
      expiresAt: refreshTokenEntity.expiresAt,
      createdAt: refreshTokenEntity.createdAt,
      lastUsedAt: refreshTokenEntity.lastUsedAt,
      isRevoked: refreshTokenEntity.isRevoked
    };
  }

  /** OAuth 2.0 token rotation — issues new access token from a valid refresh token. */
  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!tokenRecord) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      if (tokenRecord.isExpired()) {
        await this.refreshTokenRepository.delete(tokenRecord.id);
        throw new Error('EXPIRED_REFRESH_TOKEN');
      }

      if (tokenRecord.isRevoked) {
        throw new Error('REVOKED_REFRESH_TOKEN');
      }

      const user = await this.userRepository.findByIdAnyLab(tokenRecord.userId);
      if (!user) {
        await this.refreshTokenRepository.delete(tokenRecord.id);
        throw new Error('USER_NOT_FOUND');
      }

      tokenRecord.recordUsage();
      await this.refreshTokenRepository.save(tokenRecord);

      const userSession = await this.userSessionRepository.findByRefreshToken(refreshToken);
      if (!userSession) {
        throw new Error('USER_SESSION_NOT_FOUND');
      }
      // A revoked session (logout, admin revoke, password change) must not mint new access tokens.
      if (!userSession.isActive) {
        throw new Error('REVOKED_REFRESH_TOKEN');
      }

      // Don't update lastUsedAt — token refresh is automatic, not user activity
      const newAccessToken = await this.createAccessToken(user, userSession.id);
      const accessTokenExpiryMs = await this.getAccessTokenExpiryMs();
      const accessTokenExpiry = new Date(Date.now() + accessTokenExpiryMs);

      return {
        accessToken: newAccessToken,
        accessTokenExpiry,
        tokenType: 'Bearer'
      };

    } catch (error) {
      logger.error('Token refresh failed:', { error });

      if (error instanceof Error && [
        'INVALID_REFRESH_TOKEN',
        'EXPIRED_REFRESH_TOKEN',
        'REVOKED_REFRESH_TOKEN',
        'USER_NOT_FOUND',
        'USER_SESSION_NOT_FOUND'
      ].includes(error.message)) {
        throw error;
      }

      throw new Error('TOKEN_REFRESH_FAILED');
    }
  }

  /** Short-lived (5 min) token with 'password_change' purpose claim. */
  createPasswordChangeTempToken(user: User): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const TEMP_TOKEN_EXPIRY_SECONDS = 5 * 60;

    const payload = {
      sub: user.id,
      username: user.username,
      purpose: 'password_change',
      iss: this.config.issuer,
      aud: this.config.audience,
      exp: nowSeconds + TEMP_TOKEN_EXPIRY_SECONDS,
      iat: nowSeconds,
      jti: randomUUID()
    };

    return this.signToken(payload);
  }

  /** Only accepts tokens with purpose='password_change'. */
  async verifyPasswordChangeTempToken(token: string): Promise<{ userId: string; username: string } | null> {
    try {
      const decoded = this.verifyToken<{
        sub: string;
        username: string;
        purpose: string;
        exp: number;
        iat: number;
      }>(token);

      if (decoded.purpose !== 'password_change') {
        logger.warn('Token is not a password change token');
        return null;
      }

      const user = await this.userRepository.findByIdAnyLab(decoded.sub);
      if (!user) {
        logger.warn('User not found for temp token', { userId: decoded.sub });
        return null;
      }

      return {
        userId: decoded.sub,
        username: decoded.username
      };

    } catch (error) {
      logger.warn('Temp token validation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}
