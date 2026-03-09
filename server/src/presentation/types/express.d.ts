import { User } from '@domain/entities/User';

/**
 * Express Request type extension
 *
 * Augments Express Request with authenticated user context.
 * Properties are added by ExpressAuthMiddleware after successful authentication.
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user entity (set by auth middleware) */
      user?: User;
      /** Session ID for the current request (set by auth middleware) */
      sessionId?: string;
      /** Rate limit identifier (set by rate limiting middleware) */
      rateLimitIdentifier?: string;
      /** Rate limit service instance (set by rate limiting middleware) */
      rateLimitService?: import('@domain/services/RateLimitingService').RateLimitingService;
    }
  }
}

export {};
