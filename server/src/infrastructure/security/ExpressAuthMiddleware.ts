/**
 * Express Auth Middleware
 *
 * Express-specific implementation of authentication middleware.
 * Uses SessionService for session validation with timeout enforcement.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { SessionService } from '@application/commands/UserCommands';
import { logger } from '@infrastructure/logging/logger';

export class ExpressAuthMiddleware implements AuthMiddleware {
  constructor(
    private sessionService: SessionService
  ) {}

  get authenticate(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authorization header required'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        // Use validateSessionWithActivity with updateActivity: true (default)
        // This updates lastUsedAt for real user activity
        const result = await this.sessionService.validateSessionWithActivity(token);

        if (!result.success) {
          // Map error codes to appropriate HTTP responses
          const errorMessages: Record<string, string> = {
            INVALID_TOKEN: 'Invalid or expired token',
            SESSION_REVOKED: 'Session has been revoked',
            SESSION_IDLE_TIMEOUT: 'Session timed out due to inactivity',
            SESSION_ABSOLUTE_TIMEOUT: 'Session expired - please log in again',
            LAB_DEACTIVATED: 'Your lab has been deactivated. Contact your system administrator'
          };

          res.status(401).json({
            success: false,
            error: {
              code: result.code,
              message: errorMessages[result.code] || 'Authentication failed'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        // Block non-approved users immediately (catches deactivated/suspended mid-session)
        if (!result.user.isApproved()) {
          const statusMessages: Record<string, string> = {
            deactivated: 'Account has been deactivated. Contact your lab administrator',
            suspended: 'Account has been suspended. Contact your system administrator',
            pending: 'Account is awaiting administrator approval',
            rejected: 'Account access has been denied'
          };
          const message = statusMessages[result.user.status] || 'Account is not approved for access';

          res.status(403).json({
            success: false,
            error: {
              code: 'ACCOUNT_INACTIVE',
              message
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
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

        res.status(500).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication service error'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    };
  }

  get requireAdmin(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        if (!req.user.isAdmin()) {
          logger.warn('Non-admin user attempted admin access', {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role.value,
            path: req.path,
            method: req.method
          });

          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        logger.debug('Admin access granted', {
          userId: req.user.id,
          username: req.user.username,
          path: req.path
        });

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Admin authorization middleware error', {
          error: errorMessage,
          path: req.path,
          method: req.method
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Authorization service error'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    };
  }

  get requireSystemAdmin(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        if (!req.user.isSystemAdmin()) {
          logger.warn('Non-system-admin user attempted system admin access', {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role.value,
            path: req.path,
            method: req.method
          });

          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'System admin access required'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('System admin authorization middleware error', {
          error: errorMessage,
          path: req.path,
          method: req.method
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Authorization service error'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    };
  }

  get optionalAuthenticate(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        // No auth header is OK for optional auth
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          next();
          return;
        }

        const token = authHeader.substring(7);
        const validationResult = await this.sessionService.validateSession(token);

        if (validationResult) {
          req.user = validationResult.user;
          req.sessionId = validationResult.sessionId;
          logger.debug('Optional authentication successful', {
            userId: validationResult.user.id,
            username: validationResult.user.username,
            sessionId: validationResult.sessionId,
            path: req.path
          });
        } else {
          logger.debug('Optional authentication failed - continuing without user', {
            path: req.path
          });
        }

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Optional authentication error - continuing without user', {
          error: errorMessage,
          path: req.path
        });
        // For optional auth, we continue even if there's an error
        next();
      }
    };
  }
}
