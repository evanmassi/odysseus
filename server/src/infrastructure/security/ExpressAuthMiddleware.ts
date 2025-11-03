/**
 * Express Auth Middleware
 * 
 * Express-specific implementation of authentication middleware.
 * Uses CQRS pattern for user validation and session management.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { SessionService } from '@application/commands/UserCommands';
import { User } from '@domain/entities/User';
import { logger } from '@utils/logger';

export class ExpressAuthMiddleware implements AuthMiddleware {
  constructor(
    private sessionService: SessionService
  ) {}

  get authenticate(): RequestHandler {
    return async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<void> => {
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

        let user: User | null = null;

        try {
          user = await this.sessionService.validateSession(token);
        } catch (validateError) {
          logger.error('Session validation error', {
            error: validateError instanceof Error ? validateError.message : 'Unknown error',
            path: req.path
          });
        }

        if (!user) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_SESSION',
              message: 'Invalid or expired session'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }

        // Add user to request context
        req.user = user;

        logger.debug('User authenticated successfully', {
          userId: user.id,
          username: user.username,
          role: user.role.value,
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
    return (req: Request & { user?: User }, res: Response, next: NextFunction): void => {
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

  get optionalAuthenticate(): RequestHandler {
    return async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        
        // No auth header is OK for optional auth
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          next();
          return;
        }

        const token = authHeader.substring(7);
        const user = await this.sessionService.validateSession(token);

        if (user) {
          req.user = user;
          logger.debug('Optional authentication successful', {
            userId: user.id,
            username: user.username,
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
