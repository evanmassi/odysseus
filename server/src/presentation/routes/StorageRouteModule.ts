import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { StorageController } from '@presentation/controllers/StorageController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';
import { logger } from '@infrastructure/logging/logger';

/**
 * Storage Route Module
 *
 * Handles all configuration-related HTTP routes with proper authentication and authorization.
 *
 * Routes:
 * - GET /api/storage - Get current configuration (authenticated)
 * - PUT /api/storage/system - Update system settings (admin only)  
 * - PUT /api/storage/equipment - Update equipment config (admin only)
 * - GET /api/storage/history - Get config history (admin only)
 * - GET /api/storage/version/:version - Get specific version (admin only)
 * - POST /api/storage/reset - Reset to defaults (admin only)
 * - POST /api/storage/import - Import configuration (admin only)
 * - GET /api/storage/health - Health check (authenticated)
 */
export class StorageRouteModule implements RouteModule {
  
  constructor(
    private storageController: StorageController,
    private authMiddleware: AuthMiddleware
  ) {}

  /**
   * Get base path for configuration routes
   */
  getBasePath(): string {
    return '/api/storage';
  }

  /**
   * Get middleware stack applied to all configuration routes
   */
  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  /**
   * Configure routes on the provided router
   * Implementation of RouteModule interface
   */
  configure(router: Router): void {
    this.configureRoutes(router);
  }

  /**
   * Configure configuration routes
   */
  configureRoutes(router: Router): void {
    
    // PUBLIC CONFIGURATION ROUTES (Authenticated Users)

    /**
     * GET /api/storage
     * Get current system configuration
     *
     * Access: Any authenticated user
     * Used by: Frontend for initial app configuration
     */
    router.get('/',
      this.storageController.getCurrentStorage.bind(this.storageController)
    );

    /**
     * GET /api/storage/version
     * Get current configuration version (lightweight)
     *
     * Access: Any authenticated user
     * Used by: Client-side cache validation on startup
     */
    router.get('/version',
      this.storageController.getStorageVersion.bind(this.storageController)
    );

    /**
     * GET /api/storage/health
     * Check configuration system health
     *
     * Access: Any authenticated user
     * Used by: System monitoring, health checks
     */
    router.get('/health',
      this.storageController.checkStorageHealth.bind(this.storageController)
    );

    /**
     * PUT /api/storage/box-position-display
     * Update position display configuration for a specific box
     *
     * Access: Any authenticated user
     * Used by: Frontend when changing box labeling format (numeric vs alphanumeric)
     */
    router.put('/box-position-display',
      this.storageController.updateBoxPositionDisplay.bind(this.storageController)
    );

    /**
     * PUT /api/storage/lab-position-display
     * Update lab-wide default position display format
     *
     * Access: Any authenticated user
     * Used by: Frontend when changing lab-wide default labeling format
     */
    router.put('/lab-position-display',
      this.storageController.updateLabDefaultPositionDisplay.bind(this.storageController)
    );

    /**
     * GET /api/storage/position-display-presets
     * Get available position display format presets
     *
     * Access: Any authenticated user
     * Used by: Frontend to populate position display format selector
     */
    router.get('/position-display-presets',
      this.storageController.getPositionDisplayPresets.bind(this.storageController)
    );

    /**
     * PUT /api/storage/resource-label
     * Update custom label for a rack or box
     *
     * Access: Any authenticated user (uses fine-grained canEditResource permission)
     * Used by: Frontend when users set custom labels on their assigned resources
     * Note: Not admin-only - owners can set labels on their own resources
     */
    router.put('/resource-label',
      this.storageController.updateResourceLabel.bind(this.storageController)
    );

    // ADMIN CONFIGURATION ROUTES (Admin Only)

    /**
     * PUT /api/storage/system
     * Update system configuration settings
     * 
     * Access: Admin users only
     * Used by: Admin panel system settings page
     */
    router.put('/system',
      this.requireAdminPermission.bind(this),
      this.storageController.updateSystemStorage.bind(this.storageController)
    );

    /**
     * GET /api/storage/history
     * Get configuration history with pagination
     * 
     * Access: Admin users only
     * Used by: Admin audit trail, configuration rollback features
     */
    router.get('/history',
      this.requireAdminPermission.bind(this),
      this.storageController.getStorageHistory.bind(this.storageController)
    );

    /**
     * GET /api/storage/version/:version
     * Get specific configuration version
     * 
     * Access: Admin users only
     * Used by: Storage comparison, rollback operations
     */
    router.get('/version/:version',
      this.requireAdminPermission.bind(this),
      this.storageController.getStorageByVersion.bind(this.storageController)
    );

    /**
     * POST /api/storage/reset
     * Reset configuration to factory defaults
     * 
     * Access: Admin users only
     * Used by: Emergency configuration reset, initial setup
     */
    router.post('/reset',
      this.requireAdminPermission.bind(this),
      this.storageController.resetStorageToDefault.bind(this.storageController)
    );

    /**
     * POST /api/storage/import
     * Import configuration from JSON data
     * 
     * Access: Admin users only
     * Used by: Storage migration, backup restoration
     */
    router.post('/import',
      this.requireAdminPermission.bind(this),
      this.storageController.importStorage.bind(this.storageController)
    );

    // CQRS TANK ROUTES (Admin Only)

    /**
     * POST /api/storage/tanks
     * Add a new tank
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.post('/tanks',
      this.requireAdminPermission.bind(this),
      this.storageController.addTank.bind(this.storageController)
    );

    /**
     * PUT /api/storage/tanks/:tankId
     * Update a tank
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.put('/tanks/:tankId',
      this.requireAdminPermission.bind(this),
      this.storageController.updateTank.bind(this.storageController)
    );

    /**
     * DELETE /api/storage/tanks/:tankId
     * Delete a tank (blocked if tubes exist)
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.delete('/tanks/:tankId',
      this.requireAdminPermission.bind(this),
      this.storageController.deleteTank.bind(this.storageController)
    );

    // CQRS RACK ROUTES (Admin Only)

    /**
     * POST /api/storage/tanks/:tankId/racks
     * Add rack(s) to a tank (supports bulk via count parameter)
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.post('/tanks/:tankId/racks',
      this.requireAdminPermission.bind(this),
      this.storageController.addRacks.bind(this.storageController)
    );

    /**
     * PUT /api/storage/tanks/:tankId/racks/:rackId
     * Update a rack
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.put('/tanks/:tankId/racks/:rackId',
      this.requireAdminPermission.bind(this),
      this.storageController.updateRack.bind(this.storageController)
    );

    /**
     * DELETE /api/storage/tanks/:tankId/racks/:rackId
     * Delete a rack (blocked if tubes exist)
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.delete('/tanks/:tankId/racks/:rackId',
      this.requireAdminPermission.bind(this),
      this.storageController.deleteRack.bind(this.storageController)
    );

    /**
     * PUT /api/storage/tanks/:tankId/racks/:rackId/assign
     * Assign or unassign a rack to a user
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.put('/tanks/:tankId/racks/:rackId/assign',
      this.requireAdminPermission.bind(this),
      this.storageController.assignRack.bind(this.storageController)
    );

    // CQRS BOX ROUTES (Admin Only)

    /**
     * POST /api/storage/tanks/:tankId/racks/:rackId/boxes
     * Add box(es) to a rack (supports bulk via count parameter)
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.post('/tanks/:tankId/racks/:rackId/boxes',
      this.requireAdminPermission.bind(this),
      this.storageController.addBoxes.bind(this.storageController)
    );

    /**
     * PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId
     * Update a box
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.requireAdminPermission.bind(this),
      this.storageController.updateBox.bind(this.storageController)
    );

    /**
     * DELETE /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId
     * Delete a box (blocked if tubes exist)
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.delete('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.requireAdminPermission.bind(this),
      this.storageController.deleteBox.bind(this.storageController)
    );

    /**
     * PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId/assign
     * Assign or unassign a box to a user
     *
     * Access: Admin users only
     * Used by: Storage management modal
     */
    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId/assign',
      this.requireAdminPermission.bind(this),
      this.storageController.assignBox.bind(this.storageController)
    );

    // BULK ASSIGNMENT ROUTES (Admin Only)

    /**
     * POST /api/storage/bulk-unassign
     * Unassign all resources from a user
     *
     * Access: Admin users only
     * Used by: User deactivation workflow
     */
    router.post('/bulk-unassign',
      this.requireAdminPermission.bind(this),
      this.storageController.bulkUnassignResources.bind(this.storageController)
    );

    /**
     * POST /api/storage/bulk-reassign
     * Reassign all resources from one user to another
     *
     * Access: Admin users only
     * Used by: User management, resource transfer
     */
    router.post('/bulk-reassign',
      this.requireAdminPermission.bind(this),
      this.storageController.bulkReassignResources.bind(this.storageController)
    );

    // INITIALIZE ROUTE (Admin Only)

    /**
     * POST /api/storage/initialize
     * Initialize configuration for fresh install
     *
     * Access: Admin users only
     * Used by: First-time setup wizard
     */
    router.post('/initialize',
      this.requireAdminPermission.bind(this),
      this.storageController.initializeStorage.bind(this.storageController)
    );

    // EXPORT ROUTES

    /**
     * GET /api/storage/export
     * Export current configuration as JSON
     *
     * Access: Admin users only
     * Used by: Storage backup, migration preparation
     */
    router.get('/export',
      this.requireAdminPermission.bind(this),
      this.exportStorage.bind(this)
    );
  }

  /**
   * Get route count for monitoring
   */
  getRouteCount(): number {
    return 27; // Total number of routes configured (13 original + 14 CQRS)
  }

  // MIDDLEWARE FUNCTIONS

  /**
   * Require admin permission middleware
   * Ensures only admin users can access admin configuration endpoints
   */
  private async requireAdminPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
        return;
      }

      if (!user.role?.isAdmin()) {
        res.status(403).json({
          error: {
            code: 'ADMIN_REQUIRED',
            message: 'Administrator privileges required for configuration management'
          }
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('Admin permission check failed:', { error });
      res.status(500).json({
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: 'Failed to verify admin permissions'
        }
      });
    }
  }

  // ADDITIONAL ROUTE HANDLERS

  /**
   * Export current configuration as downloadable JSON
   */
  private async exportStorage(req: Request, res: Response): Promise<void> {
    try {
      // Get current configuration through controller
      // This is a simplified approach - in a full implementation,
      // you'd inject the query handler directly
      const mockRequest = { user: req.user } as Request;
      const mockResponse = {
        json: (data: unknown) => data,
        status: () => mockResponse
      } as unknown as Response;

      await this.storageController.getCurrentStorage(mockRequest, mockResponse);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition',
        `attachment; filename="odysseus-config-${new Date().toISOString().split('T')[0]}.json"`);

      // Return configuration data
      res.json({
        exported: new Date().toISOString(),
        version: 'current',
        configuration: mockResponse.json
      });

    } catch (error) {
      logger.error('Storage export failed:', { error });
      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export configuration'
        }
      });
    }
  }
}
