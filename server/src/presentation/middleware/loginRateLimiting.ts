/**
 * Rate Limiting Middleware
 *
 * Configurable rate limiting for login endpoints using Clean Architecture principles.
 * Implements factory pattern with dependency injection for testability and flexibility.
 *
 * Architecture:
 * - RateLimitingService: Core business logic for tracking and enforcing rate limits
 * - createRateLimitMiddleware: Factory function that creates Express middleware
 * - ConfigurationRepository: Injected dependency for reading security policies
 *
 * @module middleware/RateLimiting
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { logger } from '@infrastructure/logging/logger';

/**
 * Represents a single rate limit attempt record
 */
interface RateLimitAttempt {
  /** Number of attempts within current time window */
  count: number;
  /** Timestamp when lockout expires (if locked out) */
  lockedUntil?: number;
  /** Timestamp of first attempt in current window */
  firstAttempt: number;
}

/**
 * Result of checking if an identifier is rate limited
 */
interface BlockStatus {
  /** Whether the identifier is currently blocked */
  blocked: boolean;
  /** Seconds remaining until unblocked (if blocked) */
  timeRemaining?: number;
}

/**
 * Rate Limiting Service
 *
 * Tracks login attempts and enforces configurable rate limits.
 * Uses in-memory storage with automatic cleanup of expired entries.
 *
 * Design decisions:
 * - In-memory storage: Fast, no DB overhead, suitable for rate limiting
 * - Per-identifier tracking: Uses IP address as identifier
 * - Sliding window: Resets after time window expires
 * - Automatic cleanup: Prevents memory leaks from abandoned attempts
 */
export class RateLimitingService {
  private attempts: Map<string, RateLimitAttempt> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
  private readonly TIME_WINDOW_MS = 60000; // 1 minute

  constructor(private readonly configurationRepository: ConfigurationRepository) {
    // Schedule periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired lockouts and old attempt windows
   * Prevents unbounded memory growth from abandoned attempts
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, attempt] of this.attempts.entries()) {
      // Remove expired lockouts
      if (attempt.lockedUntil && attempt.lockedUntil < now) {
        keysToDelete.push(key);
        continue;
      }

      // Remove attempts older than time window (not locked out)
      if (!attempt.lockedUntil && now - attempt.firstAttempt > this.TIME_WINDOW_MS) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.attempts.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Check if an identifier is currently blocked due to rate limiting
   *
   * @param identifier - Unique identifier (typically IP address)
   * @returns Block status with time remaining if blocked
   */
  async isBlocked(identifier: string): Promise<BlockStatus> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    // If rate limiting disabled, allow all requests
    if (!securityConfig.enableRateLimiting) {
      return { blocked: false };
    }

    const attempt = this.attempts.get(identifier);
    if (!attempt) {
      return { blocked: false };
    }

    const now = Date.now();

    // Check if currently in lockout period
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const timeRemaining = Math.ceil((attempt.lockedUntil - now) / 1000);
      return { blocked: true, timeRemaining };
    }

    // Lockout expired, allow request
    if (attempt.lockedUntil && attempt.lockedUntil <= now) {
      this.attempts.delete(identifier);
      return { blocked: false };
    }

    return { blocked: false };
  }

  /**
   * Record a failed login attempt
   * Enforces rate limits by tracking attempts within time window
   *
   * @param identifier - Unique identifier (typically IP address)
   */
  async recordAttempt(identifier: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    // If rate limiting disabled, don't track attempts
    if (!securityConfig.enableRateLimiting) {
      return;
    }

    const now = Date.now();
    let attempt = this.attempts.get(identifier);

    if (!attempt) {
      // First attempt - create new record
      attempt = {
        count: 1,
        firstAttempt: now
      };
      this.attempts.set(identifier, attempt);
      return;
    }

    // Check if attempt is outside time window - reset counter
    if (now - attempt.firstAttempt > this.TIME_WINDOW_MS) {
      attempt.count = 1;
      attempt.firstAttempt = now;
      delete attempt.lockedUntil;
    } else {
      // Within time window - increment counter
      attempt.count++;
    }

    // Check if exceeded limit - apply lockout
    if (attempt.count >= securityConfig.loginAttemptsPerMinute) {
      attempt.lockedUntil = now + (securityConfig.lockoutDurationMinutes * 60 * 1000);

      logger.warn('Rate limit exceeded, user locked out', {
        identifier,
        attempts: attempt.count,
        lockoutMinutes: securityConfig.lockoutDurationMinutes,
        expiresAt: new Date(attempt.lockedUntil).toISOString()
      });
    }

    this.attempts.set(identifier, attempt);
  }

  /**
   * Record successful login - clears rate limit attempts
   * Called after successful authentication to reset counter
   *
   * @param identifier - Unique identifier (typically IP address)
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
    logger.debug(`Rate limiter: cleared attempts for ${identifier} after successful login`);
  }

  /**
   * Shutdown cleanup interval
   * Should be called when service is being destroyed
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      logger.debug('Rate limiting service shutdown');
    }
  }

  /**
   * Get current statistics for monitoring
   * Useful for admin dashboards and debugging
   */
  getStatistics(): { totalTracked: number; lockedOut: number } {
    const now = Date.now();
    let lockedOut = 0;

    for (const attempt of this.attempts.values()) {
      if (attempt.lockedUntil && attempt.lockedUntil > now) {
        lockedOut++;
      }
    }

    return {
      totalTracked: this.attempts.size,
      lockedOut
    };
  }
}

/**
 * Factory function to create rate limiting middleware
 *
 * @param configurationRepository - Repository for reading security configuration
 * @returns Express middleware function for rate limiting
 *
 * @example
 * ```typescript
 * const rateLimiter = createRateLimitMiddleware(configRepository);
 * router.post('/login', rateLimiter, controller.login);
 * ```
 */
export function createRateLimitMiddleware(
  configurationRepository: ConfigurationRepository
): RequestHandler {
  const service = new RateLimitingService(configurationRepository);

  // Return Express middleware function
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const securityConfig = await configurationRepository.getSecurityConfig();

      // If rate limiting disabled, skip middleware
      if (!securityConfig.enableRateLimiting) {
        return next();
      }

      // Extract identifier from request (IP address)
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';

      // Check if identifier is currently blocked
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
      // Middleware only checks block status - controller records attempts
      req.rateLimitIdentifier = identifier;
      req.rateLimitService = service;

      next();
    } catch (error) {
      // Log error but don't block request on middleware failures
      logger.error('Rate limiting middleware error:', error);
      next();
    }
  };
}

/**
 * Record a failed login attempt
 * Call this when authentication fails to increment the attempt counter
 *
 * @param req - Express request object
 */
export async function recordFailedLogin(req: Request): Promise<void> {
  const identifier = req.rateLimitIdentifier;
  const service: RateLimitingService = req.rateLimitService;

  if (identifier && service) {
    await service.recordAttempt(identifier);
  }
}

/**
 * Record a successful login
 * Call this after successful authentication to clear rate limit attempts
 *
 * @param req - Express request object
 */
export function recordSuccessfulLogin(req: Request): void {
  const identifier = req.rateLimitIdentifier;
  const service: RateLimitingService = req.rateLimitService;

  if (identifier && service) {
    service.recordSuccess(identifier);
  }
}
