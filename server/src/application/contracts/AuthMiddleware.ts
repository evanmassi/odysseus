/**
 * Authentication Middleware Interface
 *
 * Contract for request authentication and role-gating middleware.
 */

import type { RequestHandler } from 'express';

export interface AuthMiddleware {
  authenticate: RequestHandler;
  requireAdmin: RequestHandler;
  requireSystemAdmin: RequestHandler;
}
