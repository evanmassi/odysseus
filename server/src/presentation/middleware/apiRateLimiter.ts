/**
 * API Rate Limiting
 *
 * Express-rate-limit middleware factories for global and endpoint-specific throttling.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import { rateLimit } from 'express-rate-limit';

import { logger } from '@infrastructure/logging/logger';

import type { Request, Response } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';

const ONE_MINUTE = 60_000;

function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
    code: API_ERROR_CODES.RATE_LIMITED,
    timestamp: new Date().toISOString(),
  });
}

function createLimiter(limit: number, windowMs: number = ONE_MINUTE): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true,
    handler: rateLimitHandler,
  });
}

export function createGlobalRateLimiter(): RateLimitRequestHandler {
  logger.info('Global API rate limiter enabled', { limit: 300, windowMs: ONE_MINUTE });
  return createLimiter(300);
}

export function createStrictRateLimiter(): RateLimitRequestHandler {
  return createLimiter(5);
}

export function createModerateRateLimiter(): RateLimitRequestHandler {
  return createLimiter(20);
}

export function createAuthRateLimiter(): RateLimitRequestHandler {
  return createLimiter(10);
}
