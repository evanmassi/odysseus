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

  requireSystemAdmin: RequestHandler;

  optionalAuthenticate: RequestHandler;
}
