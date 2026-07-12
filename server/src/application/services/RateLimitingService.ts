/**
 * Rate Limiting Service
 *
 * In-memory tracking of login attempts with configurable lockout enforcement.
 */

import type { StorageRepository } from '@domain/repositories/StorageRepository';
import { logger } from '@infrastructure/logging/logger';

interface RateLimitAttempt {
  count: number;
  lockedUntil?: number;
  firstAttempt: number;
}

export interface BlockStatus {
  blocked: boolean;
  timeRemaining?: number;
}

export class RateLimitingService {
  private attempts: Map<string, RateLimitAttempt> = new Map();
  private readonly CLEANUP_INTERVAL_MS = 60000;
  private readonly TIME_WINDOW_MS = 60000;

  constructor(private readonly storageRepository: StorageRepository) {
    // Prevents unbounded memory growth from abandoned attempts
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, attempt] of this.attempts.entries()) {
      if (attempt.lockedUntil && attempt.lockedUntil < now) {
        keysToDelete.push(key);
        continue;
      }

      if (!attempt.lockedUntil && now - attempt.firstAttempt > this.TIME_WINDOW_MS) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.attempts.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  async isBlocked(identifier: string): Promise<BlockStatus> {
    const securityConfig = await this.storageRepository.getSecurityConfig();

    if (!securityConfig.enableRateLimiting) {
      return { blocked: false };
    }

    const attempt = this.attempts.get(identifier);
    if (!attempt) {
      return { blocked: false };
    }

    const now = Date.now();

    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const timeRemaining = Math.ceil((attempt.lockedUntil - now) / 1000);
      return { blocked: true, timeRemaining };
    }

    if (attempt.lockedUntil && attempt.lockedUntil <= now) {
      this.attempts.delete(identifier);
      return { blocked: false };
    }

    return { blocked: false };
  }

  async recordAttempt(identifier: string): Promise<void> {
    const securityConfig = await this.storageRepository.getSecurityConfig();

    if (!securityConfig.enableRateLimiting) {
      return;
    }

    const now = Date.now();
    let attempt = this.attempts.get(identifier);

    if (!attempt) {
      attempt = {
        count: 1,
        firstAttempt: now
      };
      this.attempts.set(identifier, attempt);
      return;
    }

    if (now - attempt.firstAttempt > this.TIME_WINDOW_MS) {
      attempt.count = 1;
      attempt.firstAttempt = now;
      delete attempt.lockedUntil;
    } else {
      attempt.count++;
    }

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

  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
    logger.debug(`Rate limiter: cleared attempts for ${identifier} after successful login`);
  }
}
