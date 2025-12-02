import { Request, Response } from 'express';
import {
  GetCurrentConfigurationQueryHandler,
  GetConfigurationHistoryQueryHandler,
  GetConfigurationByVersionQueryHandler,
  CheckConfigurationHealthQueryHandler
} from '@application/queries/ConfigurationQueries';
import {
  UpdateSystemConfigurationCommandHandler,
  UpdateEquipmentConfigurationCommandHandler,
  ResetConfigurationToDefaultCommandHandler,
  ImportConfigurationCommandHandler,
  UpdateConfigurationCommandHandler,
  UpdateBoxPositionDisplayCommandHandler,
  UpdateLabDefaultPositionDisplayCommandHandler,
  UpdateResourceLabelCommandHandler
} from '@application/commands/ConfigurationCommands';
import { POSITION_DISPLAY_PRESETS } from '@odysseus/shared-schemas';
// import { ApiError } from '../../shared/errors/ApiError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ConfigurationDto } from '@application/dto/ConfigurationDto';

/**
 * Configuration Controller - CQRS-based configuration management
 *
 * Handles HTTP requests for system configuration operations.
 * Delegates business logic to CQRS command/query handlers.
 *
 * Routes:
 * - GET /api/configuration - Get current configuration
 * - PUT /api/configuration/system - Update system settings
 * - PUT /api/configuration/equipment - Update equipment configuration
 * - GET /api/configuration/history - Get configuration history
 * - GET /api/configuration/version/:version - Get specific version
 * - POST /api/configuration/reset - Reset to defaults
 * - POST /api/configuration/import - Import configuration
 * - GET /api/configuration/health - Configuration health check
 */
export class ConfigurationController {
  
  constructor(
    // Query handlers
    private getCurrentConfigurationHandler: GetCurrentConfigurationQueryHandler,
    private getConfigurationHistoryHandler: GetConfigurationHistoryQueryHandler,
    private getConfigurationByVersionHandler: GetConfigurationByVersionQueryHandler,
    private checkConfigurationHealthHandler: CheckConfigurationHealthQueryHandler,

    // Command handlers
    private updateSystemConfigurationHandler: UpdateSystemConfigurationCommandHandler,
    private updateEquipmentConfigurationHandler: UpdateEquipmentConfigurationCommandHandler,
    private resetConfigurationHandler: ResetConfigurationToDefaultCommandHandler,
    private importConfigurationHandler: ImportConfigurationCommandHandler,
    private updateConfigurationHandler: UpdateConfigurationCommandHandler,
    private updateBoxPositionDisplayHandler: UpdateBoxPositionDisplayCommandHandler,
    private updateLabDefaultPositionDisplayHandler: UpdateLabDefaultPositionDisplayCommandHandler,
    private updateResourceLabelHandler: UpdateResourceLabelCommandHandler
  ) {}

  // QUERY ENDPOINTS

  /**
   * GET /api/configuration
   * Get current system configuration
   */
  async getCurrentConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const configuration = await this.getCurrentConfigurationHandler.handle({});

      // Use DTO to transform domain entity to API response format
      const configurationResponse = ConfigurationDto.toResponse(configuration);

      res.json({
        success: true,
        data: configurationResponse
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to get current configuration');
    }
  }

  /**
   * GET /api/configuration/history
   * Get configuration history with pagination
   */
  async getConfigurationHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await this.getConfigurationHistoryHandler.handle({
        limit,
        offset
      });
      
      const response = {
        configurations: history.map(config => ({
          version: config.version,
          lastUpdated: config.timestamp,
          systemSettings: config.configuration.systemSettings
        })),
        pagination: {
          limit,
          offset,
          total: history.length
        }
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'Failed to get configuration history');
    }
  }

  /**
   * GET /api/configuration/version/:version
   * Get specific configuration version
   */
  async getConfigurationByVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = parseInt(req.params.version);
      
      if (isNaN(version) || version < 1) {
        res.status(400).json({ 
          error: 'Invalid version number. Must be a positive integer.' 
        });
        return;
      }
      
      const configuration = await this.getConfigurationByVersionHandler.handle({
        version
      });
      
      const response = {
        version: configuration.version,
        lastUpdated: configuration.updatedAt,
        systemSettings: configuration.systemSettings,
        equipment: configuration.equipment
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'Failed to get configuration version');
    }
  }

  /**
   * GET /api/configuration/health
   * Check configuration system health
   */
  async checkConfigurationHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.checkConfigurationHealthHandler.handle({});
      
      res.json({
        status: health.isHealthy ? 'healthy' : 'unhealthy',
        version: health.version,
        lastUpdated: health.lastUpdated,
        issues: health.issues
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to check configuration health');
    }
  }

  // COMMAND ENDPOINTS

  /**
   * PUT /api/configuration/system
   * Update system configuration settings
   */
  async updateSystemConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      
      const updatedConfiguration = await this.updateSystemConfigurationHandler.handle({
        userId,
        systemSettings: req.body
      });
      
      res.json({
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt,
        systemSettings: updatedConfiguration.systemSettings
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to update system configuration');
    }
  }

  /**
   * PUT /api/configuration/equipment
   * Update equipment configuration
   */
  async updateEquipmentConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      
      const updatedConfiguration = await this.updateEquipmentConfigurationHandler.handle({
        userId,
        tanks: req.body.tanks,
        racks: req.body.racks,
        boxes: req.body.boxes
      });
      
      res.json({
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt,
        equipment: updatedConfiguration.equipment
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to update equipment configuration');
    }
  }

  /**
   * POST /api/configuration/reset
   * Reset configuration to factory defaults
   */
  async resetConfigurationToDefault(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const confirmationToken = req.body.confirmationToken;
      
      if (!confirmationToken) {
        res.status(400).json({
          error: 'Confirmation token required for configuration reset'
        });
        return;
      }
      
      const defaultConfiguration = await this.resetConfigurationHandler.handle({
        userId,
        confirmationToken
      });
      
      res.json({
        message: 'Configuration reset to defaults successfully',
        version: defaultConfiguration.version,
        lastUpdated: defaultConfiguration.updatedAt
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to reset configuration');
    }
  }

  /**
   * POST /api/configuration/import
   * Import configuration from JSON data
   */
  async importConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const validateOnly = req.query.validateOnly === 'true';
      
      const result = await this.importConfigurationHandler.handle({
        userId,
        configurationData: req.body,
        validateOnly
      });
      
      if (!result.isValid) {
        res.status(400).json({
          error: 'Configuration import validation failed',
          errors: result.errors,
          warnings: result.warnings
        });
        return;
      }
      
      const response: any = {
        success: true,
        warnings: result.warnings
      };
      
      if (result.configuration) {
        response.configuration = {
          version: result.configuration.version,
          lastUpdated: result.configuration.updatedAt
        };
      }
      
      if (validateOnly) {
        response.message = 'Configuration validation successful';
      } else {
        response.message = 'Configuration imported successfully';
      }
      
      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'Failed to import configuration');
    }
  }

  /**
   * PUT /api/configuration
   * Update complete system and lab configuration
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);

      // Extract configuration from request body (matches SaveConfigurationRequestSchema)
      const { configuration } = req.body;

      if (!configuration || !configuration.systemConfig || !configuration.currentLab) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request must include configuration.systemConfig and configuration.currentLab'
          }
        });
        return;
      }

      // Transform client format to domain format using DTO
      const transformedLab = ConfigurationDto.fromRequest(configuration.currentLab);

      const updatedConfiguration = await this.updateConfigurationHandler.handle({
        userId,
        systemConfig: configuration.systemConfig,
        currentLab: transformedLab
      });

      res.json({
        message: 'Configuration updated successfully',
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt,
        systemConfig: updatedConfiguration.systemSettings
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update configuration');
    }
  }

  /**
   * PUT /api/configuration/box-position-display
   * Update position display configuration for a specific box
   */
  async updateBoxPositionDisplay(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId, positionDisplay } = req.body;

      if (!tankId || !rackId || !boxId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'tankId, rackId, and boxId are required'
          }
        });
        return;
      }

      const updatedConfiguration = await this.updateBoxPositionDisplayHandler.handle({
        userId,
        tankId,
        rackId,
        boxId,
        positionDisplay: positionDisplay || null
      });

      res.json({
        success: true,
        message: `Position display updated for box ${boxId}`,
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update box position display');
    }
  }

  /**
   * PUT /api/configuration/lab-position-display
   * Update lab-wide default position display format
   */
  async updateLabDefaultPositionDisplay(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { positionDisplay } = req.body;

      const updatedConfiguration = await this.updateLabDefaultPositionDisplayHandler.handle({
        userId,
        positionDisplay: positionDisplay || null
      });

      res.json({
        success: true,
        message: positionDisplay
          ? `Lab default position display updated to ${positionDisplay.format}`
          : 'Lab default position display cleared',
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update lab default position display');
    }
  }

  /**
   * PUT /api/configuration/resource-label
   * Update custom label for a rack or box
   *
   * This endpoint uses fine-grained permissions (canEditResource) rather than
   * admin-only config management permissions, allowing resource owners to
   * set their own labels.
   */
  async updateResourceLabel(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { resourceType, tankId, rackId, boxId, customLabel } = req.body;

      if (!resourceType || !['rack', 'box'].includes(resourceType)) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'resourceType must be "rack" or "box"'
          }
        });
        return;
      }

      if (!tankId || !rackId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'tankId and rackId are required'
          }
        });
        return;
      }

      if (resourceType === 'box' && !boxId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'boxId is required for box label updates'
          }
        });
        return;
      }

      const updatedConfiguration = await this.updateResourceLabelHandler.handle({
        userId,
        resourceType,
        tankId,
        rackId,
        boxId,
        customLabel
      });

      res.json({
        success: true,
        message: `Label updated for ${resourceType} ${resourceType === 'box' ? boxId : rackId}`,
        version: updatedConfiguration.version,
        lastUpdated: updatedConfiguration.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update resource label');
    }
  }

  /**
   * GET /api/configuration/position-display-presets
   * Get available position display format presets
   */
  async getPositionDisplayPresets(req: Request, res: Response): Promise<void> {
    try {
      // Return presets from shared-schemas
      res.json({
        success: true,
        presets: {
          numeric: POSITION_DISPLAY_PRESETS.NUMERIC,
          alphanumericStandard: POSITION_DISPLAY_PRESETS.ALPHANUMERIC_STANDARD,
          alphanumericReverse: POSITION_DISPLAY_PRESETS.ALPHANUMERIC_REVERSE
        },
        description: {
          numeric: 'Simple numeric labeling (1-81)',
          alphanumericStandard: 'Alphanumeric row-column format (A1-I9)',
          alphanumericReverse: 'Alphanumeric column-row format (1A-9I)'
        }
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to get position display presets');
    }
  }

  // UTILITY METHODS

  /**
   * Extract user ID from authenticated request
   */
  private extractUserId(req: Request): string {
    // Assuming user ID is added to request by authentication middleware
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new ValidationError('User authentication required');
    }
    
    return userId;
  }

  /**
   * Centralized error handling
   */
  private handleError(error: unknown, res: Response, fallbackMessage: string): void {
    console.error('Configuration API error:', error);

    if (error instanceof PermissionError) {
      res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: error.message
        }
      });
      return;
    }

    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
      return;
    }

    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: fallbackMessage
      }
    });
  }
}
