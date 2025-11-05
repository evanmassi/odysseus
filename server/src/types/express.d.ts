/**
 * Express Type Augmentation
 *
 * Extends Express Request interface with custom properties added by middleware.
 * Provides type safety for user authentication and rate limiting.
 */

import { User } from '@domain/entities/User';
import { RateLimitingService } from '@middleware/RateLimiting';

declare global {
  namespace Express {
    interface Request {
      /** Current authenticated user (set by auth middleware) */
      user?: User;

      /** Session ID extracted from JWT token (set by auth middleware) */
      sessionId?: string;

      /** Rate limiting identifier (IP address) */
      rateLimitIdentifier?: string;

      /** Rate limiting service instance */
      rateLimitService?: RateLimitingService;
    }
  }
}
