/**
 * Authentication Middleware Interface
 * 
 * Defines the contract for authentication middleware.
 * This abstraction allows for different auth implementations without changing routes.
 */

import { RequestHandler } from 'express';

export interface AuthMiddleware {
  /**
   * Middleware that authenticates requests and adds user to request context.
   * 
   * @returns Express middleware function
   */
  authenticate: RequestHandler;

  /**
   * Middleware that requires admin role.
   * Should be used after authenticate middleware.
   * 
   * @returns Express middleware function  
   */
  requireAdmin: RequestHandler;

  /**
   * Optional authentication middleware.
   * Adds user to request context if valid token provided, but doesn't reject if missing.
   * 
   * @returns Express middleware function
   */
  optionalAuthenticate: RequestHandler;
}
