import { Request, Response } from 'express';
import { logger } from '@infrastructure/logging/logger';
import {
  GetCurrentStorageQueryHandler,
  GetStorageHistoryQueryHandler,
  GetStorageByVersionQueryHandler,
  CheckStorageHealthQueryHandler
} from '@application/queries/StorageQueries';
import {
  UpdateSystemStorageCommandHandler,
  ResetStorageToDefaultCommandHandler,
  ImportStorageCommandHandler,
  UpdateBoxPositionDisplayCommandHandler,
  UpdateLabDefaultPositionDisplayCommandHandler,
  UpdateResourceLabelCommandHandler
} from '@application/commands/StorageCommands';
import {
  AddTankCommandHandler,
  UpdateTankCommandHandler,
  DeleteTankCommandHandler,
  ResetDemoDataCommandHandler
} from '@application/commands/TankCommands';
import {
  AddRacksCommandHandler,
  UpdateRackCommandHandler,
  DeleteRackCommandHandler,
  AssignRackCommandHandler
} from '@application/commands/RackCommands';
import {
  AddBoxesCommandHandler,
  UpdateBoxCommandHandler,
  DeleteBoxCommandHandler,
  AssignBoxCommandHandler
} from '@application/commands/BoxCommands';
import {
  BulkUnassignResourcesCommandHandler,
  BulkReassignResourcesCommandHandler
} from '@application/commands/BulkAssignmentCommands';
import {
  SeedDemoCommandHandler,
  UnseedDemoCommandHandler
} from '@application/commands/DemoSeedCommands';
import { InitializeStorageCommandHandler } from '@application/commands/InitializeStorageCommand';
import { POSITION_DISPLAY_PRESETS } from '@odysseus/shared-schemas';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ConflictError } from '@domain/errors/ConflictError';
import { StorageDto } from '@application/dto/StorageDto';
import { BaseController } from '@presentation/controllers/BaseController';
import type { LabRepository } from '@domain/repositories/LabRepository';

/** Response shape for configuration import endpoint */
interface ImportStorageResponse {
  success: boolean;
  warnings: string[];
  message: string;
  configuration?: {
    version: number;
    lastUpdated: Date;
  };
}

/**
 * Storage Controller - CQRS-based storage management
 *
 * Handles HTTP requests for system configuration operations.
 * Delegates business logic to CQRS command/query handlers.
 *
 * Routes:
 * - GET /api/storage - Get current configuration
 * - PUT /api/storage/system - Update system settings
 * - PUT /api/storage/equipment - Update equipment configuration
 * - GET /api/storage/history - Get configuration history
 * - GET /api/storage/version/:version - Get specific version
 * - POST /api/storage/reset - Reset to defaults
 * - POST /api/storage/import - Import configuration
 * - GET /api/storage/health - Storage health check
 */
export interface StorageControllerDeps {
  // Query handlers
  getCurrentStorageHandler: GetCurrentStorageQueryHandler;
  getStorageHistoryHandler: GetStorageHistoryQueryHandler;
  getStorageByVersionHandler: GetStorageByVersionQueryHandler;
  checkStorageHealthHandler: CheckStorageHealthQueryHandler;

  // System-wide configuration handlers
  updateSystemStorageHandler: UpdateSystemStorageCommandHandler;
  resetStorageHandler: ResetStorageToDefaultCommandHandler;
  importStorageHandler: ImportStorageCommandHandler;
  updateBoxPositionDisplayHandler: UpdateBoxPositionDisplayCommandHandler;
  updateLabDefaultPositionDisplayHandler: UpdateLabDefaultPositionDisplayCommandHandler;
  updateResourceLabelHandler: UpdateResourceLabelCommandHandler;

  // Atomic resource handlers
  addTankHandler: AddTankCommandHandler;
  updateTankHandler: UpdateTankCommandHandler;
  deleteTankHandler: DeleteTankCommandHandler;
  resetDemoDataHandler: ResetDemoDataCommandHandler;
  addRacksHandler: AddRacksCommandHandler;
  updateRackHandler: UpdateRackCommandHandler;
  deleteRackHandler: DeleteRackCommandHandler;
  assignRackHandler: AssignRackCommandHandler;
  addBoxesHandler: AddBoxesCommandHandler;
  updateBoxHandler: UpdateBoxCommandHandler;
  deleteBoxHandler: DeleteBoxCommandHandler;
  assignBoxHandler: AssignBoxCommandHandler;
  bulkUnassignHandler: BulkUnassignResourcesCommandHandler;
  bulkReassignHandler: BulkReassignResourcesCommandHandler;
  seedDemoHandler: SeedDemoCommandHandler;
  unseedDemoHandler: UnseedDemoCommandHandler;
  initializeConfigHandler: InitializeStorageCommandHandler;
  labRepository: LabRepository;
}

export class StorageController extends BaseController {
  private getCurrentStorageHandler: GetCurrentStorageQueryHandler;
  private getStorageHistoryHandler: GetStorageHistoryQueryHandler;
  private getStorageByVersionHandler: GetStorageByVersionQueryHandler;
  private checkStorageHealthHandler: CheckStorageHealthQueryHandler;
  private updateSystemStorageHandler: UpdateSystemStorageCommandHandler;
  private resetStorageHandler: ResetStorageToDefaultCommandHandler;
  private importStorageHandler: ImportStorageCommandHandler;
  private updateBoxPositionDisplayHandler: UpdateBoxPositionDisplayCommandHandler;
  private updateLabDefaultPositionDisplayHandler: UpdateLabDefaultPositionDisplayCommandHandler;
  private updateResourceLabelHandler: UpdateResourceLabelCommandHandler;
  private addTankHandler: AddTankCommandHandler;
  private updateTankHandler: UpdateTankCommandHandler;
  private deleteTankHandler: DeleteTankCommandHandler;
  private resetDemoDataHandler: ResetDemoDataCommandHandler;
  private addRacksHandler: AddRacksCommandHandler;
  private updateRackHandler: UpdateRackCommandHandler;
  private deleteRackHandler: DeleteRackCommandHandler;
  private assignRackHandler: AssignRackCommandHandler;
  private addBoxesHandler: AddBoxesCommandHandler;
  private updateBoxHandler: UpdateBoxCommandHandler;
  private deleteBoxHandler: DeleteBoxCommandHandler;
  private assignBoxHandler: AssignBoxCommandHandler;
  private bulkUnassignHandler: BulkUnassignResourcesCommandHandler;
  private bulkReassignHandler: BulkReassignResourcesCommandHandler;
  private seedDemoHandler: SeedDemoCommandHandler;
  private unseedDemoHandler: UnseedDemoCommandHandler;
  private initializeConfigHandler: InitializeStorageCommandHandler;
  private labRepository: LabRepository;

  constructor(deps: StorageControllerDeps) {
    super();
    this.getCurrentStorageHandler = deps.getCurrentStorageHandler;
    this.getStorageHistoryHandler = deps.getStorageHistoryHandler;
    this.getStorageByVersionHandler = deps.getStorageByVersionHandler;
    this.checkStorageHealthHandler = deps.checkStorageHealthHandler;
    this.updateSystemStorageHandler = deps.updateSystemStorageHandler;
    this.resetStorageHandler = deps.resetStorageHandler;
    this.importStorageHandler = deps.importStorageHandler;
    this.updateBoxPositionDisplayHandler = deps.updateBoxPositionDisplayHandler;
    this.updateLabDefaultPositionDisplayHandler = deps.updateLabDefaultPositionDisplayHandler;
    this.updateResourceLabelHandler = deps.updateResourceLabelHandler;
    this.addTankHandler = deps.addTankHandler;
    this.updateTankHandler = deps.updateTankHandler;
    this.deleteTankHandler = deps.deleteTankHandler;
    this.resetDemoDataHandler = deps.resetDemoDataHandler;
    this.addRacksHandler = deps.addRacksHandler;
    this.updateRackHandler = deps.updateRackHandler;
    this.deleteRackHandler = deps.deleteRackHandler;
    this.assignRackHandler = deps.assignRackHandler;
    this.addBoxesHandler = deps.addBoxesHandler;
    this.updateBoxHandler = deps.updateBoxHandler;
    this.deleteBoxHandler = deps.deleteBoxHandler;
    this.assignBoxHandler = deps.assignBoxHandler;
    this.bulkUnassignHandler = deps.bulkUnassignHandler;
    this.bulkReassignHandler = deps.bulkReassignHandler;
    this.seedDemoHandler = deps.seedDemoHandler;
    this.unseedDemoHandler = deps.unseedDemoHandler;
    this.initializeConfigHandler = deps.initializeConfigHandler;
    this.labRepository = deps.labRepository;
  }

  // QUERY ENDPOINTS

  /**
   * GET /api/storage
   * Get current system configuration filtered by user's demo status.
   * Demo users see only demo tanks; real users see only real tanks.
   */
  async getCurrentStorage(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        throw new Error('Authentication required');
      }

      if (!user.labId) {
        res.status(400).json({
          success: false,
          error: 'No lab context',
          code: 'NO_LAB_CONTEXT',
          message: 'User is not associated with a lab. System admins must select a lab first.',
        });
        return;
      }

      const configuration = await this.getCurrentStorageHandler.handle({ labId: user.labId });

      // Use DTO to transform domain entity to API response format
      const configurationResponse = StorageDto.toResponse(configuration);

      if (user.isDemo) {
        const lab = await this.labRepository.findById(user.labId);
        if (lab?.demoLimits) {
          configurationResponse.configuration.currentLab.demoLimits = lab.demoLimits;
        }
      }

      res.json({
        success: true,
        data: configurationResponse
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to get current configuration');
    }
  }

  /**
   * GET /api/storage/history
   * Get configuration history with pagination
   */
  async getStorageHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const labId = this.extractLabId(req);
      const history = await this.getStorageHistoryHandler.handle({
        labId,
        limit
      });

      const response = {
        configurations: history.map(config => ({
          version: config.version,
          lastUpdated: config.timestamp,
          systemSettings: config.storage.systemSettings
        })),
        pagination: {
          limit,
          total: history.length
        }
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'Failed to get configuration history');
    }
  }

  /**
   * GET /api/storage/version/:version
   * Get specific configuration version
   */
  async getStorageByVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = parseInt(req.params.version);
      
      if (isNaN(version) || version < 1) {
        res.status(400).json({ 
          error: 'Invalid version number. Must be a positive integer.' 
        });
        return;
      }
      
      const labId = this.extractLabId(req);
      const configuration = await this.getStorageByVersionHandler.handle({
        labId,
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
   * GET /api/storage/version
   * Get current configuration version (lightweight endpoint for cache validation)
   */
  async getStorageVersion(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const configuration = await this.getCurrentStorageHandler.handle({ labId });

      res.json({
        success: true,
        data: {
          version: configuration.version,
          updatedAt: configuration.updatedAt
        }
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to get configuration version');
    }
  }

  /**
   * GET /api/storage/health
   * Check configuration system health
   */
  async checkStorageHealth(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const health = await this.checkStorageHealthHandler.handle({ labId });
      
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
   * PUT /api/storage/system
   * Update system configuration settings
   */
  async updateSystemStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);

      const updatedStorage = await this.updateSystemStorageHandler.handle({
        userId,
        labId,
        systemSettings: req.body
      });
      
      res.json({
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt,
        systemSettings: updatedStorage.systemSettings
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to update system configuration');
    }
  }

  /**
   * POST /api/storage/reset
   * Reset configuration to factory defaults
   */
  async resetStorageToDefault(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const confirmationToken = req.body.confirmationToken;

      if (!confirmationToken) {
        res.status(400).json({
          error: 'Confirmation token required for configuration reset'
        });
        return;
      }

      const defaultStorage = await this.resetStorageHandler.handle({
        userId,
        labId,
        confirmationToken
      });
      
      res.json({
        message: 'Storage reset to defaults successfully',
        version: defaultStorage.version,
        lastUpdated: defaultStorage.updatedAt
      });
      
    } catch (error) {
      this.handleError(error, res, 'Failed to reset configuration');
    }
  }

  /**
   * POST /api/storage/import
   * Import configuration from JSON data
   */
  async importStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const validateOnly = req.query.validateOnly === 'true';

      const result = await this.importStorageHandler.handle({
        userId,
        labId,
        configurationData: req.body,
        validateOnly
      });
      
      if (!result.isValid) {
        res.status(400).json({
          error: 'Storage import validation failed',
          errors: result.errors,
          warnings: result.warnings
        });
        return;
      }
      
      const response: ImportStorageResponse = {
        success: true,
        warnings: result.warnings,
        message: validateOnly
          ? 'Storage validation successful'
          : 'Storage imported successfully'
      };

      if (result.configuration) {
        response.configuration = {
          version: result.configuration.version,
          lastUpdated: result.configuration.updatedAt
        };
      }

      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'Failed to import configuration');
    }
  }

  /**
   * PUT /api/storage/box-position-display
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

      const labId = this.extractLabId(req);

      const updatedStorage = await this.updateBoxPositionDisplayHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        boxId,
        positionDisplay: positionDisplay || null
      });

      res.json({
        success: true,
        message: `Position display updated for box ${boxId}`,
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update box position display');
    }
  }

  /**
   * PUT /api/storage/lab-position-display
   * Update lab-wide default position display format
   */
  async updateLabDefaultPositionDisplay(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { positionDisplay } = req.body;

      const updatedStorage = await this.updateLabDefaultPositionDisplayHandler.handle({
        userId,
        labId,
        positionDisplay: positionDisplay || null
      });

      res.json({
        success: true,
        message: positionDisplay
          ? `Lab default position display updated to ${positionDisplay.format}`
          : 'Lab default position display cleared',
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update lab default position display');
    }
  }

  /**
   * PUT /api/storage/resource-label
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

      const labId = this.extractLabId(req);

      const updatedStorage = await this.updateResourceLabelHandler.handle({
        userId,
        labId,
        resourceType,
        tankId,
        rackId,
        boxId,
        customLabel
      });

      res.json({
        success: true,
        message: `Label updated for ${resourceType} ${resourceType === 'box' ? boxId : rackId}`,
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to update resource label');
    }
  }

  /**
   * GET /api/storage/position-display-presets
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

  // CQRS TANK ENDPOINTS

  /**
   * POST /api/storage/tanks
   * Add a new tank
   */
  async addTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name, location } = req.body;

      if (!name) {
        res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'name is required' }
        });
        return;
      }

      const labId = this.extractLabId(req);

      const result = await this.addTankHandler.handle({ userId, labId, name, location });

      res.status(201).json({
        success: true,
        data: { success: true, tankId: result.tankId },
        message: `Tank '${name}' created`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to add tank');
    }
  }

  /**
   * PUT /api/storage/tanks/:tankId
   * Update a tank
   */
  async updateTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { name, location, isActive } = req.body;

      const labId = this.extractLabId(req);

      await this.updateTankHandler.handle({ userId, labId, tankId, name, location, isActive });

      res.json({
        success: true,
        data: { success: true },
        message: `Tank '${tankId}' updated`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update tank');
    }
  }

  /**
   * DELETE /api/storage/tanks/:tankId
   * Delete a tank
   */
  async deleteTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const tankId = req.params.tankId;

      await this.deleteTankHandler.handle({ userId, labId, tankId });

      res.json({
        success: true,
        data: { success: true },
        message: `Tank '${tankId}' deleted`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to delete tank');
    }
  }

  // CQRS RACK ENDPOINTS

  /**
   * POST /api/storage/tanks/:tankId/racks
   * Add rack(s) to a tank
   */
  async addRacks(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { count = 1 } = req.body;

      const labId = this.extractLabId(req);

      const result = await this.addRacksHandler.handle({ userId, labId, tankId, count });

      res.status(201).json({
        success: true,
        data: { success: true, rackIds: result.rackIds },
        message: `${result.rackIds.length} rack(s) created`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to add rack(s)');
    }
  }

  /**
   * PUT /api/storage/tanks/:tankId/racks/:rackId
   * Update a rack
   */
  async updateRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { name, capacity, isActive } = req.body;

      const labId = this.extractLabId(req);

      await this.updateRackHandler.handle({ userId, labId, tankId, rackId, name, capacity, isActive });

      res.json({
        success: true,
        data: { success: true },
        message: `Rack '${rackId}' updated`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update rack');
    }
  }

  /**
   * DELETE /api/storage/tanks/:tankId/racks/:rackId
   * Delete a rack
   */
  async deleteRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId } = req.params;

      await this.deleteRackHandler.handle({ userId, labId, tankId, rackId });

      res.json({
        success: true,
        data: { success: true },
        message: `Rack '${rackId}' deleted`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to delete rack');
    }
  }

  /**
   * PUT /api/storage/tanks/:tankId/racks/:rackId/assign
   * Assign or unassign a rack
   */
  async assignRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { assignedUserId } = req.body;

      const labId = this.extractLabId(req);

      await this.assignRackHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        assignedUserId: assignedUserId ?? null
      });

      res.json({
        success: true,
        data: { success: true },
        message: assignedUserId
          ? `Rack '${rackId}' assigned to user`
          : `Rack '${rackId}' unassigned`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to assign rack');
    }
  }

  // CQRS BOX ENDPOINTS

  /**
   * POST /api/storage/tanks/:tankId/racks/:rackId/boxes
   * Add box(es) to a rack
   */
  async addBoxes(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { count = 1 } = req.body;

      const labId = this.extractLabId(req);

      const result = await this.addBoxesHandler.handle({ userId, labId, tankId, rackId, count });

      res.status(201).json({
        success: true,
        data: { success: true, boxIds: result.boxIds },
        message: `${result.boxIds.length} box(es) created`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to add box(es)');
    }
  }

  /**
   * PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId
   * Update a box
   */
  async updateBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { name, gridConfig, positionDisplay, isActive } = req.body;

      const labId = this.extractLabId(req);

      await this.updateBoxHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        boxId,
        name,
        gridConfig,
        positionDisplay,
        isActive
      });

      res.json({
        success: true,
        data: { success: true },
        message: `Box '${boxId}' updated`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update box');
    }
  }

  /**
   * DELETE /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId
   * Delete a box
   */
  async deleteBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId, boxId } = req.params;

      await this.deleteBoxHandler.handle({ userId, labId, tankId, rackId, boxId });

      res.json({
        success: true,
        data: { success: true },
        message: `Box '${boxId}' deleted`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to delete box');
    }
  }

  /**
   * PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId/assign
   * Assign or unassign a box
   */
  async assignBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { assignedUserId } = req.body;

      const labId = this.extractLabId(req);

      await this.assignBoxHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        boxId,
        assignedUserId: assignedUserId ?? null
      });

      res.json({
        success: true,
        data: { success: true },
        message: assignedUserId
          ? `Box '${boxId}' assigned to user`
          : `Box '${boxId}' unassigned`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to assign box');
    }
  }

  // BULK ASSIGNMENT ENDPOINTS

  /**
   * POST /api/storage/bulk-unassign
   * Unassign all resources from a user
   */
  async bulkUnassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId } = req.body;

      if (!fromUserId) {
        res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'fromUserId is required' }
        });
        return;
      }

      const labId = this.extractLabId(req);

      const result = await this.bulkUnassignHandler.handle({ userId, labId, fromUserId });

      res.json({
        success: true,
        data: {
          racksAffected: result.racksAffected,
          boxesAffected: result.boxesAffected,
        },
        message: `Unassigned ${result.racksAffected} rack(s) and ${result.boxesAffected} box(es)`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to bulk unassign resources');
    }
  }

  /**
   * POST /api/storage/bulk-reassign
   * Reassign all resources from one user to another
   */
  async bulkReassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId, toUserId } = req.body;

      if (!fromUserId || !toUserId) {
        res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'fromUserId and toUserId are required' }
        });
        return;
      }

      const labId = this.extractLabId(req);

      const result = await this.bulkReassignHandler.handle({ userId, labId, fromUserId, toUserId });

      res.json({
        success: true,
        data: {
          racksAffected: result.racksAffected,
          boxesAffected: result.boxesAffected,
        },
        message: `Reassigned ${result.racksAffected} rack(s) and ${result.boxesAffected} box(es)`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to bulk reassign resources');
    }
  }

  // INITIALIZE ENDPOINT

  /**
   * POST /api/storage/initialize
   * Initialize configuration for fresh install
   */
  async initializeStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labName, tankCount, racksPerTank, boxesPerRack } = req.body;

      if (!labName) {
        res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'labName is required' }
        });
        return;
      }

      if (!req.user?.labId) {
        res.status(400).json({
          success: false,
          error: 'No lab context',
          code: 'NO_LAB_CONTEXT',
          message: 'User is not associated with a lab.',
        });
        return;
      }

      const labId = req.user.labId;

      await this.initializeConfigHandler.handle({
        userId,
        labId,
        labName,
        tankCount,
        racksPerTank,
        boxesPerRack
      });

      res.status(201).json({
        success: true,
        data: { success: true },
        message: `Storage initialized for lab '${labName}'`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to initialize configuration');
    }
  }

  // UTILITY METHODS

  /**
   * Extract user ID from authenticated request
   */
  protected override extractUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('User authentication required');
    }
    return userId;
  }

  /**
   * Centralized error handling
   */
  private handleError(error: unknown, res: Response, fallbackMessage: string): void {
    logger.error('Storage API error:', { error });

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

    if (error instanceof ConflictError) {
      res.status(409).json({
        error: {
          code: 'CONFLICT_ERROR',
          message: error.message,
          currentVersion: error.currentVersion,
          expectedVersion: error.expectedVersion
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

  // SYSTEM ADMIN WRAPPERS (labId from URL params)

  async resetDemoDataForLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.resetDemoDataHandler.handle({ userId, labId });

      res.json({
        success: true,
        data: { message: 'Demo data reset successfully', deletedTubes: result.deletedTubes }
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to reset demo data');
    }
  }

  async seedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.seedDemoHandler.handle({ userId, labId });

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, 'Failed to seed demo lab');
    }
  }

  async unseedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.unseedDemoHandler.handle({ userId, labId });

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, 'Failed to unseed demo lab');
    }
  }
}
