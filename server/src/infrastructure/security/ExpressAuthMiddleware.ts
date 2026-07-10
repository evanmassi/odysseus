/**
 * Express Auth Middleware
 *
 * Express-specific implementation of authentication middleware.
 * Uses SessionService for session validation with timeout enforcement.
 */


import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { SessionService } from '@application/contracts/SessionService';
import { logger } from '@infrastructure/logging/logger';

import type { Request, Response, NextFunction, RequestHandler } from 'express';

function errorResponse(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  });
}

function requireRoleMiddleware(
  check: (user: Request['user']) => boolean,
  label: string
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        errorResponse(res, 401, API_ERROR_CODES.UNAUTHORIZED, 'Authentication required');
        return;
      }

      if (!check(req.user)) {
        logger.warn(`Non-${label} user attempted ${label} access`, {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role.value,
          path: req.path,
          method: req.method
        });

        errorResponse(res, 403, API_ERROR_CODES.FORBIDDEN, `${label} access required`);
        return;
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`${label} authorization middleware error`, {
        error: errorMessage,
        path: req.path,
        method: req.method
      });

      errorResponse(res, 500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, 'Authorization service error');
    }
  };
}

export class ExpressAuthMiddleware implements AuthMiddleware {
  constructor(
    private sessionService: SessionService
  ) {}

  get authenticate(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          errorResponse(res, 401, API_ERROR_CODES.UNAUTHORIZED, 'Authorization header required');
          return;
        }

        const token = authHeader.substring(7);

        const result = await this.sessionService.validateSessionWithActivity(token);

        if (!result.success) {
          const errorMessages: Record<string, string> = {
            INVALID_TOKEN: 'Invalid or expired token',
            SESSION_REVOKED: 'Session has been revoked',
            SESSION_IDLE_TIMEOUT: 'Session timed out due to inactivity',
            SESSION_ABSOLUTE_TIMEOUT: 'Session expired - please log in again',
            LAB_DEACTIVATED: 'Your lab has been deactivated. Contact your system administrator'
          };

          errorResponse(res, 401, result.code, errorMessages[result.code] || 'Authentication failed');
          return;
        }

        // Catches status changes (deactivated/suspended) that occurred mid-session
        if (!result.user.isApproved()) {
          const statusMessages: Record<string, string> = {
            deactivated: 'Account has been deactivated. Contact your lab administrator',
            suspended: 'Account has been suspended. Contact your system administrator',
            pending: 'Account is awaiting administrator approval',
            rejected: 'Account access has been denied'
          };
          const message = statusMessages[result.user.status] || 'Account is not approved for access';

          errorResponse(res, 403, API_ERROR_CODES.FORBIDDEN, message);
          return;
        }

        req.user = result.user;
        req.sessionId = result.sessionId;

        logger.debug('User authenticated successfully', {
          userId: result.user.id,
          username: result.user.username,
          role: result.user.role.value,
          sessionId: result.sessionId,
          path: req.path
        });

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Authentication middleware error', {
          error: errorMessage,
          path: req.path,
          method: req.method
        });

        errorResponse(res, 500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, 'Authentication service error');
      }
    };
  }

  get requireAdmin(): RequestHandler {
    return requireRoleMiddleware(user => user!.isAdmin(), 'Admin');
  }

  get requireSystemAdmin(): RequestHandler {
    return requireRoleMiddleware(user => user!.isSystemAdmin(), 'System admin');
  }
}
