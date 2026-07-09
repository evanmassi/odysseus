/**
 * Route Registry
 *
 * Central orchestrator for route module registration, middleware, and global error handling.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import { Router } from 'express';


import { logger } from '@infrastructure/logging/logger';
import type { RouteModule } from '@presentation/routes/RouteModule';

import type { Application, Request, Response, NextFunction } from 'express';


export class RouteRegistry {
  private modules: RouteModule[] = [];

  constructor(
    private app: Application,
    private isDevelopment: boolean
  ) {}

  registerModule(module: RouteModule): void {
    this.modules.push(module);
    logger.debug('Route module registered', { 
      basePath: module.getBasePath(),
      module: module.constructor.name 
    });
  }

  applyRoutes(): void {
    for (const module of this.modules) {
      this.registerModuleRoutes(module);
    }

    this.applyGlobalErrorHandler();
    this.apply404Handler();
  }

  private registerModuleRoutes(module: RouteModule): void {
    const router = Router();
    const basePath = module.getBasePath();
    const middleware = module.getMiddleware();

    if (middleware.length > 0) {
      router.use(...middleware);
    }

    module.configure(router);
    this.app.use(basePath, router);

    logger.debug('Module routes registered', {
      module: module.constructor.name,
      basePath,
      middlewareCount: middleware.length
    });
  }

  private applyGlobalErrorHandler(): void {
    this.app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Global error handler triggered', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      if (res.headersSent) {
        return next(error);
      }

      const errorObj = error as Record<string, unknown>;
      const statusCode = typeof errorObj.statusCode === 'number' ? errorObj.statusCode
        : typeof errorObj.status === 'number' ? errorObj.status : 500;
      const errorCode = typeof errorObj.code === 'string' ? errorObj.code : API_ERROR_CODES.INTERNAL_SERVER_ERROR;
      const context = errorObj.context as Record<string, unknown> | undefined;

      // Send standardized error response (flat structure matching errorEnvelopeSchema)
      res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
        code: errorCode,
        details: context,
        timestamp: new Date().toISOString(),
        ...(this.isDevelopment && { stack: err.stack })
      });
    });
  }

  private apply404Handler(): void {
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn('404 - Route not found', {
        path: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`,
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        timestamp: new Date().toISOString()
      });
    });
  }
}
