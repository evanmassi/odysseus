/**
 * Route Registry
 * 
 * Central orchestrator for all route modules.
 * Handles module registration, middleware application, and error handling.
 */

import { Express, Router, Request, Response, NextFunction } from 'express';
import { RouteModule } from '@presentation/routes/RouteModule';
import { logger } from '@infrastructure/logging/logger';

export class RouteRegistry {
  private modules: RouteModule[] = [];

  constructor(
    private app: Express
  ) {}

  /**
   * Register a route module
   */
  registerModule(module: RouteModule): void {
    this.modules.push(module);
    logger.debug('Route module registered', { 
      basePath: module.getBasePath(),
      module: module.constructor.name 
    });
  }

  /**
   * Apply all registered modules to the Express app
   */
  applyRoutes(): void {
    for (const module of this.modules) {
      this.registerModuleRoutes(module);
    }

    // Apply global error handler after all routes
    this.applyGlobalErrorHandler();

    // Apply 404 handler last
    this.apply404Handler();
  }

  /**
   * Register routes for a specific module
   */
  private registerModuleRoutes(module: RouteModule): void {
    const router = Router();
    const basePath = module.getBasePath();
    const middleware = module.getMiddleware();

    // Apply module-specific middleware
    if (middleware.length > 0) {
      router.use(...middleware);
    }

    // Configure module routes
    module.configure(router);

    // Mount the router
    this.app.use(basePath, router);

    logger.debug('Module routes registered', {
      module: module.constructor.name,
      basePath,
      middlewareCount: middleware.length
    });
  }

  /**
   * Apply global error handling middleware
   */
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

      // Check if response already sent
      if (res.headersSent) {
        return next(error);
      }

      // Determine error details with type-safe property access
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorObj = error as Record<string, unknown>;
      const statusCode = typeof errorObj.statusCode === 'number' ? errorObj.statusCode
        : typeof errorObj.status === 'number' ? errorObj.status : 500;
      const errorCode = typeof errorObj.code === 'string' ? errorObj.code : 'INTERNAL_SERVER_ERROR';
      const context = errorObj.context as Record<string, unknown> | undefined;

      // Send standardized error response (flat structure matching errorEnvelopeSchema)
      res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
        code: errorCode,
        details: context,
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: err.stack })
      });
    });
  }

  /**
   * Apply 404 handler for unmatched routes
   */
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
        code: 'ROUTE_NOT_FOUND',
        details: {
          path: req.originalUrl,
          method: req.method,
          availableEndpoints: [
            'GET /api/public/health',
            'GET /api/public/auth/first-time',
            'POST /api/public/auth/register',
            'POST /api/public/auth/login',
            'GET /api/auth/verify',
            'GET /api/auth/me',
            'GET /api/tubes',
            'GET /api/admin/users',
            'GET /api/configuration',
            'PUT /api/configuration/system',
            'PUT /api/configuration/equipment',
            'GET /api/configuration/history',
            'POST /api/configuration/reset',
            'POST /api/configuration/import',
            'GET /api/configuration/health'
          ]
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Get summary of registered modules (for debugging/monitoring)
   */
  getModuleSummary(): Array<{ name: string; basePath: string; middlewareCount: number }> {
    return this.modules.map(module => ({
      name: module.constructor.name,
      basePath: module.getBasePath(),
      middlewareCount: module.getMiddleware().length
    }));
  }
}
