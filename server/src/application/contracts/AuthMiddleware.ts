/**
 * Authentication Middleware Interface
 *
 * Contract for request authentication and role-gating middleware.
 */

import { RequestHandler } from 'express';

export interface AuthMiddleware {
  authenticate: RequestHandler;
  requireAdmin: RequestHandler;
  requireSystemAdmin: RequestHandler;
}
