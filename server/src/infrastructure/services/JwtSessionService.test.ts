/**
 * JWT Session Service Tests
 *
 * Tests token creation, validation, refresh, and timeout handling.
 */

import * as jwt from 'jsonwebtoken';
import { JwtSessionService } from './JwtSessionService';
import { User } from '@domain/entities/User';
import { UserRole } from '@domain/valueObjects/UserRole';
import { UserSession } from '@domain/entities/UserSession';
import { RefreshToken } from '@domain/entities/RefreshToken';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('JwtSessionService', () => {
  let service: JwtSessionService;
  let mockConfigService: { get: jest.Mock };
  let mockUserRepository: {
    findById: jest.Mock;
  };
  let mockRefreshTokenRepository: {
    findByToken: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let mockConfigurationRepository: {
    getSecurityConfig: jest.Mock;
  };
  let mockUserSessionRepository: {
    findById: jest.Mock;
    findByRefreshToken: jest.Mock;
    findActiveSessionsByUserId: jest.Mock;
    save: jest.Mock;
    revokeSession: jest.Mock;
    updateLastUsed: jest.Mock;
    countActiveSessions: jest.Mock;
    batchRevoke: jest.Mock;
  };

  const jwtConfig = {
    secret: 'test-secret-key-for-testing-purposes-only',
    expirationTime: '15m',
    issuer: 'odysseus-test',
    audience: 'odysseus-api',
    algorithm: 'HS256',
  };

  const securityConfig = {
    accessTokenExpiryMinutes: 15,
    sessionTimeoutMinutes: 30,
    absoluteSessionTimeoutHours: 24,
    idleWarningMinutes: 5,
    maxConcurrentSessions: 5,
    passwordMinLength: 8,
    requireStrongPasswords: false,
    passwordRequireSpecialChars: false,
  };

  const createMockUser = (): User => {
    return User.createWithPassword(
      'testuser',
      'password123',
      UserRole.user(),
      'researcher_123',
      undefined,
      'approved'
    );
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(jwtConfig),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findByToken: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockConfigurationRepository = {
      getSecurityConfig: jest.fn().mockResolvedValue(securityConfig),
    };

    mockUserSessionRepository = {
      findById: jest.fn(),
      findByRefreshToken: jest.fn(),
      findActiveSessionsByUserId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      revokeSession: jest.fn(),
      updateLastUsed: jest.fn(),
      countActiveSessions: jest.fn().mockResolvedValue(0),
      batchRevoke: jest.fn().mockResolvedValue(0),
    };

    service = new JwtSessionService(
      mockConfigService as any,
      mockUserRepository as any,
      mockRefreshTokenRepository as any,
      mockConfigurationRepository as any,
      mockUserSessionRepository as any
    );
  });

  describe('validateSession()', () => {
    it('should validate a valid JWT token', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_123';

      // Create a valid token
      const token = jwt.sign(
        {
          sub: mockUser.id,
          sessionId,
          username: mockUser.username,
          role: mockUser.role.value,
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { algorithm: jwtConfig.algorithm as jwt.Algorithm, expiresIn: '15m' }
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.validateSession(token);

      expect(result).not.toBeNull();
      expect(result!.user).toBe(mockUser);
      expect(result!.sessionId).toBe(sessionId);
    });

    it('should return null for expired token', async () => {
      const mockUser = createMockUser();

      // Create an expired token
      const token = jwt.sign(
        {
          sub: mockUser.id,
          sessionId: 'session_123',
          username: mockUser.username,
          role: mockUser.role.value,
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        jwtConfig.secret
      );

      const result = await service.validateSession(token);

      expect(result).toBeNull();
    });

    it('should return null for invalid signature', async () => {
      const mockUser = createMockUser();

      const token = jwt.sign(
        {
          sub: mockUser.id,
          sessionId: 'session_123',
          username: mockUser.username,
          role: mockUser.role.value,
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        'wrong-secret',
        { algorithm: 'HS256', expiresIn: '15m' }
      );

      const result = await service.validateSession(token);

      expect(result).toBeNull();
    });

    it('should return null for token with wrong issuer', async () => {
      const mockUser = createMockUser();

      const token = jwt.sign(
        {
          sub: mockUser.id,
          sessionId: 'session_123',
          username: mockUser.username,
          role: mockUser.role.value,
          iss: 'wrong-issuer',
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { algorithm: jwtConfig.algorithm as jwt.Algorithm, expiresIn: '15m' }
      );

      const result = await service.validateSession(token);

      expect(result).toBeNull();
    });

    it('should return null when user not found in database', async () => {
      const token = jwt.sign(
        {
          sub: 'user_nonexistent',
          sessionId: 'session_123',
          username: 'testuser',
          role: 'user',
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { algorithm: jwtConfig.algorithm as jwt.Algorithm, expiresIn: '15m' }
      );

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.validateSession(token);

      expect(result).toBeNull();
    });

    it('should return null for token without sessionId', async () => {
      const mockUser = createMockUser();

      const token = jwt.sign(
        {
          sub: mockUser.id,
          // Missing sessionId
          username: mockUser.username,
          role: mockUser.role.value,
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { algorithm: jwtConfig.algorithm as jwt.Algorithm, expiresIn: '15m' }
      );

      const result = await service.validateSession(token);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await service.validateSession('not.a.valid.token');

      expect(result).toBeNull();
    });
  });

  describe('validateSessionWithActivity()', () => {
    const createValidToken = (userId: string, sessionId: string): string => {
      return jwt.sign(
        {
          sub: userId,
          sessionId,
          username: 'testuser',
          role: 'user',
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { algorithm: jwtConfig.algorithm as jwt.Algorithm, expiresIn: '15m' }
      );
    };

    it('should validate session and update activity', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_active';
      const token = createValidToken(mockUser.id, sessionId);

      const now = new Date();
      const mockSession = {
        id: sessionId,
        isActive: true,
        createdAt: new Date(now.getTime() - 60000), // 1 min ago
        lastUsedAt: new Date(now.getTime() - 60000),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue(mockSession);

      const result = await service.validateSessionWithActivity(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toBe(mockUser);
        expect(result.sessionId).toBe(sessionId);
      }
      expect(mockUserSessionRepository.updateLastUsed).toHaveBeenCalledWith(
        sessionId,
        expect.any(Date)
      );
    });

    it('should not update activity when updateActivity=false', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_check';
      const token = createValidToken(mockUser.id, sessionId);

      const now = new Date();
      const mockSession = {
        id: sessionId,
        isActive: true,
        createdAt: new Date(now.getTime() - 60000),
        lastUsedAt: new Date(now.getTime() - 60000),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue(mockSession);

      await service.validateSessionWithActivity(token, { updateActivity: false });

      expect(mockUserSessionRepository.updateLastUsed).not.toHaveBeenCalled();
    });

    it('should return SESSION_REVOKED for revoked session', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_revoked';
      const token = createValidToken(mockUser.id, sessionId);

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue({
        id: sessionId,
        isActive: false, // Revoked
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      const result = await service.validateSessionWithActivity(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SESSION_REVOKED');
      }
    });

    it('should return SESSION_REVOKED when session not found', async () => {
      const mockUser = createMockUser();
      const token = createValidToken(mockUser.id, 'session_missing');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue(null);

      const result = await service.validateSessionWithActivity(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SESSION_REVOKED');
      }
    });

    it('should return SESSION_IDLE_TIMEOUT for idle session', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_idle';
      const token = createValidToken(mockUser.id, sessionId);

      const now = new Date();
      // Last used 31 minutes ago (exceeds 30 min idle timeout)
      const mockSession = {
        id: sessionId,
        isActive: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastUsedAt: new Date(now.getTime() - 31 * 60 * 1000), // 31 min ago
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue(mockSession);

      const result = await service.validateSessionWithActivity(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SESSION_IDLE_TIMEOUT');
      }
      expect(mockUserSessionRepository.revokeSession).toHaveBeenCalledWith(sessionId);
    });

    it('should return SESSION_ABSOLUTE_TIMEOUT for old session', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_old';
      const token = createValidToken(mockUser.id, sessionId);

      const now = new Date();
      // Created 25 hours ago (exceeds 24 hour absolute timeout)
      const mockSession = {
        id: sessionId,
        isActive: true,
        createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
        lastUsedAt: new Date(now.getTime() - 1000), // Recently used
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findById.mockResolvedValue(mockSession);

      const result = await service.validateSessionWithActivity(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SESSION_ABSOLUTE_TIMEOUT');
      }
      expect(mockUserSessionRepository.revokeSession).toHaveBeenCalledWith(sessionId);
    });

    it('should return INVALID_TOKEN for invalid JWT', async () => {
      const result = await service.validateSessionWithActivity('invalid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('createTokenPair()', () => {
    it('should create token pair with session', async () => {
      const mockUser = createMockUser();

      mockUserSessionRepository.save.mockResolvedValue(undefined);

      const result = await service.createTokenPair(
        mockUser,
        'Mozilla/5.0',
        '192.168.1.1',
        'Test Device'
      );

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.tokenType).toBe('Bearer');
      expect(result.tokens.accessTokenExpiry).toBeInstanceOf(Date);
      expect(result.tokens.refreshTokenExpiry).toBeInstanceOf(Date);
      expect(result.user.id).toBe(mockUser.id);
      expect(mockUserSessionRepository.save).toHaveBeenCalled();
    });

    it('should enforce session limit when creating new session', async () => {
      const mockUser = createMockUser();

      // User has 5 sessions (at limit)
      mockUserSessionRepository.countActiveSessions.mockResolvedValue(5);
      mockUserSessionRepository.findActiveSessionsByUserId.mockResolvedValue([
        { id: 'old_session_1', createdAt: new Date(Date.now() - 5000) },
        { id: 'old_session_2', createdAt: new Date(Date.now() - 4000) },
        { id: 'old_session_3', createdAt: new Date(Date.now() - 3000) },
        { id: 'old_session_4', createdAt: new Date(Date.now() - 2000) },
        { id: 'old_session_5', createdAt: new Date(Date.now() - 1000) },
      ]);
      mockUserSessionRepository.batchRevoke.mockResolvedValue(1);

      await service.createTokenPair(mockUser);

      expect(mockUserSessionRepository.batchRevoke).toHaveBeenCalledWith(['old_session_1']);
    });

    it('should store refresh token in repository', async () => {
      const mockUser = createMockUser();

      await service.createTokenPair(mockUser);

      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw error if session save fails', async () => {
      const mockUser = createMockUser();
      mockUserSessionRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createTokenPair(mockUser)).rejects.toThrow(
        'Failed to create user session'
      );
    });
  });

  describe('refreshAccessToken()', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockUser = createMockUser();
      const mockRefreshToken = {
        id: 'refresh_123',
        userId: mockUser.id,
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isRevoked: false,
        isExpired: jest.fn().mockReturnValue(false),
        recordUsage: jest.fn(),
      };

      const mockSession = {
        id: 'session_123',
        userId: mockUser.id,
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserSessionRepository.findByRefreshToken.mockResolvedValue(mockSession);

      const result = await service.refreshAccessToken('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
      expect(result.accessTokenExpiry).toBeInstanceOf(Date);
      expect(mockRefreshToken.recordUsage).toHaveBeenCalled();
    });

    it('should throw INVALID_REFRESH_TOKEN for unknown token', async () => {
      mockRefreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(service.refreshAccessToken('unknown-token')).rejects.toThrow(
        'INVALID_REFRESH_TOKEN'
      );
    });

    it('should throw EXPIRED_REFRESH_TOKEN for expired token', async () => {
      const mockRefreshToken = {
        id: 'refresh_expired',
        token: 'expired-token',
        isExpired: jest.fn().mockReturnValue(true),
        isRevoked: false,
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);

      await expect(service.refreshAccessToken('expired-token')).rejects.toThrow(
        'EXPIRED_REFRESH_TOKEN'
      );
      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith('refresh_expired');
    });

    it('should throw REVOKED_REFRESH_TOKEN for revoked token', async () => {
      const mockRefreshToken = {
        id: 'refresh_revoked',
        token: 'revoked-token',
        isExpired: jest.fn().mockReturnValue(false),
        isRevoked: true,
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);

      await expect(service.refreshAccessToken('revoked-token')).rejects.toThrow(
        'REVOKED_REFRESH_TOKEN'
      );
    });

    it('should throw USER_NOT_FOUND when user deleted', async () => {
      const mockRefreshToken = {
        id: 'refresh_orphan',
        userId: 'user_deleted',
        token: 'orphan-token',
        isExpired: jest.fn().mockReturnValue(false),
        isRevoked: false,
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.refreshAccessToken('orphan-token')).rejects.toThrow('USER_NOT_FOUND');
      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith('refresh_orphan');
    });
  });

  describe('revokeSession()', () => {
    it('should revoke session and refresh token', async () => {
      const mockUser = createMockUser();
      const sessionId = 'session_to_revoke';

      const token = jwt.sign(
        {
          sub: mockUser.id,
          sessionId,
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret
      );

      const mockSession = {
        id: sessionId,
        refreshToken: 'refresh-token-123',
      };

      const mockRefreshToken = {
        id: 'refresh_123',
        revoke: jest.fn(),
      };

      mockUserSessionRepository.findById.mockResolvedValue(mockSession);
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);

      await service.revokeSession(token);

      expect(mockUserSessionRepository.revokeSession).toHaveBeenCalledWith(sessionId);
      expect(mockRefreshToken.revoke).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should handle revocation of invalid token gracefully', async () => {
      await expect(service.revokeSession('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('createPasswordChangeTempToken() / verifyPasswordChangeTempToken()', () => {
    it('should create temporary password change token', () => {
      const mockUser = createMockUser();

      const token = service.createPasswordChangeTempToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Decode and verify purpose claim
      const decoded = jwt.decode(token) as any;
      expect(decoded.purpose).toBe('password_change');
      expect(decoded.sub).toBe(mockUser.id);
    });

    it('should verify valid password change token', async () => {
      const mockUser = createMockUser();
      const token = service.createPasswordChangeTempToken(mockUser);

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.verifyPasswordChangeTempToken(token);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(mockUser.id);
      expect(result!.username).toBe(mockUser.username);
    });

    it('should reject token with wrong purpose', async () => {
      const mockUser = createMockUser();

      // Create a regular access token (no purpose claim)
      const token = jwt.sign(
        {
          sub: mockUser.id,
          username: mockUser.username,
          purpose: 'regular_access', // Wrong purpose
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
        },
        jwtConfig.secret,
        { expiresIn: '5m' }
      );

      const result = await service.verifyPasswordChangeTempToken(token);

      expect(result).toBeNull();
    });

    it('should reject expired password change token', async () => {
      const mockUser = createMockUser();

      // Create an expired token
      const token = jwt.sign(
        {
          sub: mockUser.id,
          username: mockUser.username,
          purpose: 'password_change',
          iss: jwtConfig.issuer,
          aud: jwtConfig.audience,
          exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
        },
        jwtConfig.secret
      );

      const result = await service.verifyPasswordChangeTempToken(token);

      expect(result).toBeNull();
    });

    it('should reject token for deleted user', async () => {
      const mockUser = createMockUser();
      const token = service.createPasswordChangeTempToken(mockUser);

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.verifyPasswordChangeTempToken(token);

      expect(result).toBeNull();
    });
  });

  describe('Token Utility Methods', () => {
    it('should decode token without verification', () => {
      const payload = {
        sub: 'user_123',
        sessionId: 'session_456',
        username: 'testuser',
        role: 'user',
      };

      const token = jwt.sign(payload, 'any-secret', { expiresIn: '1h' });

      const decoded = service.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded!.sessionId).toBe('session_456');
    });

    it('should return null for malformed token decode', () => {
      const decoded = service.decodeToken('not-a-valid-token');

      expect(decoded).toBeNull();
    });

    it('should detect expired token', () => {
      const token = jwt.sign(
        { sub: 'user_123', exp: Math.floor(Date.now() / 1000) - 3600 },
        'secret'
      );

      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('should detect valid (non-expired) token', () => {
      const token = jwt.sign(
        { sub: 'user_123', exp: Math.floor(Date.now() / 1000) + 3600 },
        'secret'
      );

      expect(service.isTokenExpired(token)).toBe(false);
    });

    it('should get remaining token expiration time', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = jwt.sign({ sub: 'user_123', exp: futureExp }, 'secret');

      const remaining = service.getTokenExpirationTime(token);

      expect(remaining).toBeGreaterThan(3500000); // ~58 minutes in ms
      expect(remaining).toBeLessThanOrEqual(3600000);
    });

    it('should return 0 for expired token expiration time', () => {
      const token = jwt.sign(
        { sub: 'user_123', exp: Math.floor(Date.now() / 1000) - 3600 },
        'secret'
      );

      expect(service.getTokenExpirationTime(token)).toBe(0);
    });

    it('should return null for token without exp claim', () => {
      const token = jwt.sign({ sub: 'user_123' }, 'secret', { noTimestamp: true });

      expect(service.getTokenExpirationTime(token)).toBeNull();
    });
  });
});
