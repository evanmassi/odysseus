/**
 * Express Request type extension
 *
 * Augments Express Request with authenticated user context.
 * Properties are added by ExpressAuthMiddleware after successful authentication.
 */

import { User } from '@domain/entities/User';
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      rateLimitIdentifier?: string;
      rateLimitService?: import('@domain/services/RateLimitingService').RateLimitingService;
    }
  }
}

export {};
