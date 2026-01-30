/**
 * Express Auth Middleware Tests
 *
 * Tests authentication, admin authorization, and optional auth handlers.
 */

import { Request, Response } from 'express';
import { ExpressAuthMiddleware } from './ExpressAuthMiddleware';
import { User } from '@domain/entities/User';
import { UserRole } from '@domain/valueObjects/UserRole';

// Mock logger to prevent console output during tests
jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ExpressAuthMiddleware', () => {
  let mockSessionService: {
    validateSession: jest.Mock;
    validateSessionWithActivity: jest.Mock;
    revokeSession: jest.Mock;
  };
  let middleware: ExpressAuthMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  const createMockUser = (role: 'admin' | 'user' = 'user'): User => {
    const userRole = role === 'admin' ? UserRole.admin() : UserRole.user();
    return User.createWithPassword(
      'testuser',
      'password123',
      userRole,
      undefined,
      undefined,
      'approved'
    );
  };

  beforeEach(() => {
    mockSessionService = {
      validateSession: jest.fn(),
      validateSessionWithActivity: jest.fn(),
      revokeSession: jest.fn(),
    };

    middleware = new ExpressAuthMiddleware(mockSessionService as any);

    mockReq = {
      headers: {},
      path: '/api/test',
      method: 'GET',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFn = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 when no authorization header', async () => {
      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is malformed', async () => {
      mockReq.headers = { authorization: 'Basic token123' };

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });

    it('should authenticate with valid token', async () => {
      const mockUser = createMockUser();
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: true,
        user: mockUser,
        sessionId: 'session_123',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockSessionService.validateSessionWithActivity).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.sessionId).toBe('session_123');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: false,
        code: 'INVALID_TOKEN',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
    });

    it('should return 401 with correct message for idle timeout', async () => {
      mockReq.headers = { authorization: 'Bearer expired-token' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: false,
        code: 'SESSION_IDLE_TIMEOUT',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SESSION_IDLE_TIMEOUT',
            message: 'Session timed out due to inactivity',
          }),
        })
      );
    });

    it('should return 401 with correct message for absolute timeout', async () => {
      mockReq.headers = { authorization: 'Bearer old-token' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: false,
        code: 'SESSION_ABSOLUTE_TIMEOUT',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SESSION_ABSOLUTE_TIMEOUT',
            message: 'Session expired - please log in again',
          }),
        })
      );
    });

    it('should return 401 with correct message for revoked session', async () => {
      mockReq.headers = { authorization: 'Bearer revoked-token' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: false,
        code: 'SESSION_REVOKED',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SESSION_REVOKED',
          }),
        })
      );
    });

    it('should return 500 when session service throws error', async () => {
      mockReq.headers = { authorization: 'Bearer some-token' };
      mockSessionService.validateSessionWithActivity.mockRejectedValue(
        new Error('Database connection failed')
      );

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHENTICATION_ERROR',
          }),
        })
      );
    });

    it('should include request ID and timestamp in error response', async () => {
      mockReq.headers = { authorization: 'Bearer invalid', 'x-request-id': 'req-123' };
      mockSessionService.validateSessionWithActivity.mockResolvedValue({
        success: false,
        code: 'INVALID_TOKEN',
      });

      await middleware.authenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'req-123',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('requireAdmin', () => {
    it('should return 401 when no user on request', () => {
      middleware.requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      const regularUser = createMockUser('user');
      mockReq.user = regularUser;

      middleware.requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Admin access required',
          }),
        })
      );
    });

    it('should call next when user is admin', () => {
      const adminUser = createMockUser('admin');
      mockReq.user = adminUser;

      middleware.requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 500 when error occurs during admin check', () => {
      // Create a user mock that throws when isAdmin is called
      const faultyUser = {
        isAdmin: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
        id: 'user_123',
        username: 'faulty',
        role: { value: 'user' },
      };
      mockReq.user = faultyUser as any;

      middleware.requireAdmin(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHORIZATION_ERROR',
          }),
        })
      );
    });
  });

  describe('optionalAuthenticate', () => {
    it('should proceed without user when no auth header', async () => {
      await middleware.optionalAuthenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockSessionService.validateSession).not.toHaveBeenCalled();
    });

    it('should proceed without user when auth header is malformed', async () => {
      mockReq.headers = { authorization: 'InvalidFormat' };

      await middleware.optionalAuthenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should set user when valid token provided', async () => {
      const mockUser = createMockUser();
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockSessionService.validateSession.mockResolvedValue({
        user: mockUser,
        sessionId: 'session_456',
      });

      await middleware.optionalAuthenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.sessionId).toBe('session_456');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should proceed without user when token validation returns null', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockSessionService.validateSession.mockResolvedValue(null);

      await middleware.optionalAuthenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.user).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should proceed without user when validation throws error', async () => {
      mockReq.headers = { authorization: 'Bearer error-token' };
      mockSessionService.validateSession.mockRejectedValue(new Error('Validation failed'));

      await middleware.optionalAuthenticate(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });
});
