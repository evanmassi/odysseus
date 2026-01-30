/**
 * Rate Limiting Middleware Tests
 *
 * Tests rate limiting service and middleware for login protection.
 */

import {
  RateLimitingService,
  createRateLimitMiddleware,
  recordFailedLogin,
  recordSuccessfulLogin,
} from './RateLimiting';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { Request, Response, NextFunction } from 'express';
import type { SecurityConfig } from '@odysseus/shared-schemas';

jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RateLimitingService', () => {
  let service: RateLimitingService;
  let mockConfigRepository: jest.Mocked<ConfigurationRepository>;

  const createSecurityConfig = (overrides: Partial<SecurityConfig> = {}): SecurityConfig => ({
    useEnhancedAuth: true,
    requireStrongPasswords: true,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    accessTokenExpiryMinutes: 15,
    sessionTimeoutMinutes: 30,
    idleWarningMinutes: 25,
    absoluteSessionTimeoutHours: 12,
    maxConcurrentSessions: 3,
    enableRateLimiting: true,
    loginAttemptsPerMinute: 5,
    lockoutDurationMinutes: 15,
    enableAdminControls: true,
    enableDetailedLogging: true,
    logFailedAttempts: true,
    ...overrides,
  });

  beforeEach(() => {
    mockConfigRepository = {
      getSecurityConfig: jest.fn().mockResolvedValue(createSecurityConfig()),
    } as unknown as jest.Mocked<ConfigurationRepository>;

    service = new RateLimitingService(mockConfigRepository);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('isBlocked()', () => {
    it('should return not blocked for new identifier', async () => {
      const result = await service.isBlocked('192.168.1.1');

      expect(result.blocked).toBe(false);
    });

    it('should return not blocked when rate limiting disabled', async () => {
      mockConfigRepository.getSecurityConfig.mockResolvedValue(
        createSecurityConfig({ enableRateLimiting: false })
      );

      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');

      const result = await service.isBlocked('192.168.1.1');

      expect(result.blocked).toBe(false);
    });

    it('should return blocked after exceeding attempt limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt('192.168.1.1');
      }

      const result = await service.isBlocked('192.168.1.1');

      expect(result.blocked).toBe(true);
      expect(result.timeRemaining).toBeGreaterThan(0);
    });

    it('should return time remaining in seconds', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt('192.168.1.1');
      }

      const result = await service.isBlocked('192.168.1.1');

      // 15 minutes lockout = 900 seconds
      expect(result.timeRemaining).toBeLessThanOrEqual(900);
      expect(result.timeRemaining).toBeGreaterThan(0);
    });
  });

  describe('recordAttempt()', () => {
    it('should track first attempt', async () => {
      await service.recordAttempt('192.168.1.1');

      const stats = service.getStatistics();
      expect(stats.totalTracked).toBe(1);
    });

    it('should increment counter for same identifier', async () => {
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');

      const result = await service.isBlocked('192.168.1.1');
      expect(result.blocked).toBe(false);
    });

    it('should trigger lockout at attempt limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt('192.168.1.1');
      }

      const stats = service.getStatistics();
      expect(stats.lockedOut).toBe(1);
    });

    it('should not track when rate limiting disabled', async () => {
      mockConfigRepository.getSecurityConfig.mockResolvedValue(
        createSecurityConfig({ enableRateLimiting: false })
      );

      await service.recordAttempt('192.168.1.1');

      const stats = service.getStatistics();
      expect(stats.totalTracked).toBe(0);
    });

    it('should track different identifiers separately', async () => {
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.2');

      const stats = service.getStatistics();
      expect(stats.totalTracked).toBe(2);
    });
  });

  describe('recordSuccess()', () => {
    it('should clear attempts for identifier', async () => {
      await service.recordAttempt('192.168.1.1');
      await service.recordAttempt('192.168.1.1');

      service.recordSuccess('192.168.1.1');

      const stats = service.getStatistics();
      expect(stats.totalTracked).toBe(0);
    });

    it('should allow new attempts after success', async () => {
      for (let i = 0; i < 4; i++) {
        await service.recordAttempt('192.168.1.1');
      }

      service.recordSuccess('192.168.1.1');
      await service.recordAttempt('192.168.1.1');

      const result = await service.isBlocked('192.168.1.1');
      expect(result.blocked).toBe(false);
    });
  });

  describe('getStatistics()', () => {
    it('should return total tracked and locked out counts', async () => {
      await service.recordAttempt('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt('192.168.1.2');
      }

      const stats = service.getStatistics();

      expect(stats.totalTracked).toBe(2);
      expect(stats.lockedOut).toBe(1);
    });
  });

  describe('shutdown()', () => {
    it('should stop cleanup interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});

describe('createRateLimitMiddleware()', () => {
  let mockConfigRepository: jest.Mocked<ConfigurationRepository>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const createSecurityConfig = (overrides: Partial<SecurityConfig> = {}): SecurityConfig => ({
    useEnhancedAuth: true,
    requireStrongPasswords: true,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    accessTokenExpiryMinutes: 15,
    sessionTimeoutMinutes: 30,
    idleWarningMinutes: 25,
    absoluteSessionTimeoutHours: 12,
    maxConcurrentSessions: 3,
    enableRateLimiting: true,
    loginAttemptsPerMinute: 5,
    lockoutDurationMinutes: 15,
    enableAdminControls: true,
    enableDetailedLogging: true,
    logFailedAttempts: true,
    ...overrides,
  });

  beforeEach(() => {
    mockConfigRepository = {
      getSecurityConfig: jest.fn().mockResolvedValue(createSecurityConfig()),
    } as unknown as jest.Mocked<ConfigurationRepository>;

    mockReq = {
      ip: '192.168.1.1',
      path: '/api/public/login',
      socket: { remoteAddress: '192.168.1.1' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next when not blocked', async () => {
    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should skip middleware when rate limiting disabled', async () => {
    mockConfigRepository.getSecurityConfig.mockResolvedValue(
      createSecurityConfig({ enableRateLimiting: false })
    );

    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should attach rate limit identifier to request', async () => {
    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.rateLimitIdentifier).toBe('192.168.1.1');
  });

  it('should attach rate limit service to request', async () => {
    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.rateLimitService).toBeDefined();
  });

  it('should use socket.remoteAddress when ip is undefined', async () => {
    const reqWithoutIp = {
      path: '/api/public/login',
      socket: { remoteAddress: '192.168.1.1' } as any,
    } as Partial<Request>;

    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(reqWithoutIp as Request, mockRes as Response, mockNext);

    expect(reqWithoutIp.rateLimitIdentifier).toBe('192.168.1.1');
  });

  it('should call next on middleware error', async () => {
    mockConfigRepository.getSecurityConfig.mockRejectedValue(new Error('Config error'));

    const middleware = createRateLimitMiddleware(mockConfigRepository);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('recordFailedLogin()', () => {
  it('should call service.recordAttempt when identifier and service exist', async () => {
    const mockService = {
      recordAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const mockReq = {
      rateLimitIdentifier: '192.168.1.1',
      rateLimitService: mockService,
    } as unknown as Request;

    await recordFailedLogin(mockReq);

    expect(mockService.recordAttempt).toHaveBeenCalledWith('192.168.1.1');
  });

  it('should do nothing when identifier is missing', async () => {
    const mockService = {
      recordAttempt: jest.fn(),
    };

    const mockReq = {
      rateLimitService: mockService,
    } as unknown as Request;

    await recordFailedLogin(mockReq);

    expect(mockService.recordAttempt).not.toHaveBeenCalled();
  });

  it('should do nothing when service is missing', async () => {
    const mockReq = {
      rateLimitIdentifier: '192.168.1.1',
    } as unknown as Request;

    await expect(recordFailedLogin(mockReq)).resolves.not.toThrow();
  });
});

describe('recordSuccessfulLogin()', () => {
  it('should call service.recordSuccess when identifier and service exist', () => {
    const mockService = {
      recordSuccess: jest.fn(),
    };

    const mockReq = {
      rateLimitIdentifier: '192.168.1.1',
      rateLimitService: mockService,
    } as unknown as Request;

    recordSuccessfulLogin(mockReq);

    expect(mockService.recordSuccess).toHaveBeenCalledWith('192.168.1.1');
  });

  it('should do nothing when identifier is missing', () => {
    const mockService = {
      recordSuccess: jest.fn(),
    };

    const mockReq = {
      rateLimitService: mockService,
    } as unknown as Request;

    recordSuccessfulLogin(mockReq);

    expect(mockService.recordSuccess).not.toHaveBeenCalled();
  });
});
