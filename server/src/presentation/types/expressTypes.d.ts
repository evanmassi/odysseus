/**
 * Express Request Type Extensions
 *
 * Augments Express Request with properties added by middleware.
 */

import type { RateLimitingService } from '@application/services/RateLimitingService';
import type { User } from '@domain/entities/User';
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      rateLimitIdentifier?: string;
      rateLimitService?: RateLimitingService;
      requestId: string;
    }
  }
}

export {};
