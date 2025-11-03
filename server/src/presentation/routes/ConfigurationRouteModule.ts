import { Router } from 'express';
import { ConfigurationController } from '@presentation/controllers/ConfigurationController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';

/**
 * Configuration Route Module
 *
 * Handles all configuration-related HTTP routes with proper authentication and authorization.
 *
 * Routes:
 * - GET /api/configuration - Get current configuration (authenticated)
 * - PUT /api/configuration/system - Update system settings (admin only)  
 * - PUT /api/configuration/equipment - Update equipment config (admin only)
 * - GET /api/configuration/history - Get config history (admin only)
 * - GET /api/configuration/version/:version - Get specific version (admin only)
 * - POST /api/configuration/reset - Reset to defaults (admin only)
 * - POST /api/configuration/import - Import configuration (admin only)
 * - GET /api/configuration/health - Health check (authenticated)
 */
export class ConfigurationRouteModule implements RouteModule {
  
  constructor(
    private configurationController: ConfigurationController,
    private authMiddleware: AuthMiddleware
  ) {}

  /**
   * Get base path for configuration routes
   */
  getBasePath(): string {
    return '/api/configuration';
  }

  /**
   * Get middleware stack applied to all configuration routes
   */
  getMiddleware(): any[] {
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
     * GET /api/configuration
     * Get current system configuration
     *
     * Access: Any authenticated user
     * Used by: Frontend for initial app configuration
     */
    router.get('/',
      this.configurationController.getCurrentConfiguration.bind(this.configurationController)
    );

    /**
     * PUT /api/configuration
     * Update complete system and lab configuration
     *
     * Access: Any authenticated user
     * Used by: Frontend when saving configuration changes (racks, tanks, etc.)
     */
    router.put('/',
      this.configurationController.updateConfiguration.bind(this.configurationController)
    );

    /**
     * GET /api/configuration/health
     * Check configuration system health
     *
     * Access: Any authenticated user
     * Used by: System monitoring, health checks
     */
    router.get('/health',
      this.configurationController.checkConfigurationHealth.bind(this.configurationController)
    );

    /**
     * PUT /api/configuration/box-position-display
     * Update position display configuration for a specific box
     *
     * Access: Any authenticated user
     * Used by: Frontend when changing box labeling format (numeric vs alphanumeric)
     */
    router.put('/box-position-display',
      this.configurationController.updateBoxPositionDisplay.bind(this.configurationController)
    );

    /**
     * PUT /api/configuration/lab-position-display
     * Update lab-wide default position display format
     *
     * Access: Any authenticated user
     * Used by: Frontend when changing lab-wide default labeling format
     */
    router.put('/lab-position-display',
      this.configurationController.updateLabDefaultPositionDisplay.bind(this.configurationController)
    );

    /**
     * GET /api/configuration/position-display-presets
     * Get available position display format presets
     *
     * Access: Any authenticated user
     * Used by: Frontend to populate position display format selector
     */
    router.get('/position-display-presets',
      this.configurationController.getPositionDisplayPresets.bind(this.configurationController)
    );

    // ADMIN CONFIGURATION ROUTES (Admin Only)

    /**
     * PUT /api/configuration/system
     * Update system configuration settings
     * 
     * Access: Admin users only
     * Used by: Admin panel system settings page
     */
    router.put('/system',
      this.requireAdminPermission.bind(this),
      this.configurationController.updateSystemConfiguration.bind(this.configurationController)
    );

    /**
     * PUT /api/configuration/equipment  
     * Update equipment configuration
     * 
     * Access: Admin users only
     * Used by: Admin panel equipment management page
     */
    router.put('/equipment',
      this.requireAdminPermission.bind(this),
      this.configurationController.updateEquipmentConfiguration.bind(this.configurationController)
    );

    /**
     * GET /api/configuration/history
     * Get configuration history with pagination
     * 
     * Access: Admin users only
     * Used by: Admin audit trail, configuration rollback features
     */
    router.get('/history',
      this.requireAdminPermission.bind(this),
      this.configurationController.getConfigurationHistory.bind(this.configurationController)
    );

    /**
     * GET /api/configuration/version/:version
     * Get specific configuration version
     * 
     * Access: Admin users only
     * Used by: Configuration comparison, rollback operations
     */
    router.get('/version/:version',
      this.requireAdminPermission.bind(this),
      this.configurationController.getConfigurationByVersion.bind(this.configurationController)
    );

    /**
     * POST /api/configuration/reset
     * Reset configuration to factory defaults
     * 
     * Access: Admin users only
     * Used by: Emergency configuration reset, initial setup
     */
    router.post('/reset',
      this.requireAdminPermission.bind(this),
      this.configurationController.resetConfigurationToDefault.bind(this.configurationController)
    );

    /**
     * POST /api/configuration/import
     * Import configuration from JSON data
     * 
     * Access: Admin users only
     * Used by: Configuration migration, backup restoration
     */
    router.post('/import',
      this.requireAdminPermission.bind(this),
      this.configurationController.importConfiguration.bind(this.configurationController)
    );

    // EXPORT ROUTES

    /**
     * GET /api/configuration/export
     * Export current configuration as JSON
     * 
     * Access: Admin users only
     * Used by: Configuration backup, migration preparation
     */
    router.get('/export',
      this.requireAdminPermission.bind(this),
      this.exportConfiguration.bind(this)
    );
  }

  /**
   * Get route count for monitoring
   */
  getRouteCount(): number {
    return 11; // Total number of routes configured
  }

  // MIDDLEWARE FUNCTIONS

  /**
   * Require admin permission middleware
   * Ensures only admin users can access admin configuration endpoints
   */
  private async requireAdminPermission(req: any, res: any, next: any): Promise<void> {
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
      console.error('Admin permission check failed:', error);
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
  private async exportConfiguration(req: any, res: any): Promise<void> {
    try {
      // Get current configuration through controller
      // This is a simplified approach - in a full implementation,
      // you'd inject the query handler directly
      const mockRequest = { user: req.user } as any;
      const mockResponse = {
        json: (data: any) => data,
        status: () => mockResponse
      } as any;

      await this.configurationController.getCurrentConfiguration(mockRequest, mockResponse);
      
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
      console.error('Configuration export failed:', error);
      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export configuration'
        }
      });
    }
  }
}
