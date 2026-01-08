/**
 * Route Module Interface
 * 
 * Defines the contract for modular route registration.
 * Each module handles a specific domain of routes with appropriate middleware.
 */

import { Router, RequestHandler } from 'express';

export interface RouteModule {
  /**
   * Configure routes for this module
   */
  configure(router: Router): void;

  /**
   * Get the base path for this module's routes
   */
  getBasePath(): string;

  /**
   * Get middleware that should be applied to all routes in this module
   */
  getMiddleware(): RequestHandler[];
}

export interface RouteModuleConfig {
  basePath: string;
  middleware: RequestHandler[];
}
