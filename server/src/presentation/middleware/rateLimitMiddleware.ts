/**
 * Rate Limiting Middleware
 *
 * Express middleware that enforces login rate limits via RateLimitingService.
 */


import { RateLimitingService } from '@application/services/RateLimitingService';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import { logger } from '@infrastructure/logging/logger';

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function createRateLimitMiddleware(
  storageRepository: StorageRepository
): RequestHandler {
  const service = new RateLimitingService(storageRepository);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const securityConfig = await storageRepository.getSecurityConfig();

      if (!securityConfig.enableRateLimiting) {
        return next();
      }

      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const blockStatus = await service.isBlocked(identifier);

      if (blockStatus.blocked) {
        logger.warn('Blocked request due to rate limiting', {
          ip: identifier,
          path: req.path,
          timeRemaining: blockStatus.timeRemaining
        });

        res.status(429).json({
          success: false,
          error: 'Too many login attempts',
          message: `Please try again in ${blockStatus.timeRemaining} seconds`,
          retryAfter: blockStatus.timeRemaining
        });
        return;
      }

      // Store identifier and service for controller to record success/failure
      req.rateLimitIdentifier = identifier;
      req.rateLimitService = service;

      next();
    } catch (error) {
      // Fail open — don't block requests on middleware failures
      logger.error('Rate limiting middleware error:', error);
      next();
    }
  };
}

export async function recordFailedLogin(req: Request): Promise<void> {
  const identifier = req.rateLimitIdentifier;
  const service = req.rateLimitService;

  if (identifier && service) {
    await service.recordAttempt(identifier);
  }
}

export function recordSuccessfulLogin(req: Request): void {
  const identifier = req.rateLimitIdentifier;
  const service = req.rateLimitService;

  if (identifier && service) {
    service.recordSuccess(identifier);
  }
}
