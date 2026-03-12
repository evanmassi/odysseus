/**
 * Route Module Contract
 *
 * Interface implemented by all route modules for consistent registration via RouteRegistry.
 */

import { Router, RequestHandler } from 'express';

export interface RouteModule {
  configure(router: Router): void;
  getBasePath(): string;
  getMiddleware(): RequestHandler[];
}
