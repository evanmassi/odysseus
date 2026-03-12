/**
 * Storage Management Controller
 *
 * HTTP handlers for storage configuration, tank/rack/box CRUD, and bulk assignment operations.
 */

import { Request, Response } from 'express';
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
import { POSITION_DISPLAY_PRESETS, API_ERROR_CODES } from '@odysseus/shared-schemas';
import { StorageDto } from '@application/dto/StorageDto';
import { BaseController } from '@presentation/controllers/BaseController';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { handleControllerError } from '@presentation/utils/errorHandler';
import type { LabRepository } from '@domain/repositories/LabRepository';

export interface StorageControllerDeps {
  getCurrentStorageHandler: GetCurrentStorageQueryHandler;
  getStorageHistoryHandler: GetStorageHistoryQueryHandler;
  getStorageByVersionHandler: GetStorageByVersionQueryHandler;
  checkStorageHealthHandler: CheckStorageHealthQueryHandler;
  updateSystemStorageHandler: UpdateSystemStorageCommandHandler;
  resetStorageHandler: ResetStorageToDefaultCommandHandler;
  importStorageHandler: ImportStorageCommandHandler;
  updateBoxPositionDisplayHandler: UpdateBoxPositionDisplayCommandHandler;
  updateLabDefaultPositionDisplayHandler: UpdateLabDefaultPositionDisplayCommandHandler;
  updateResourceLabelHandler: UpdateResourceLabelCommandHandler;
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
  constructor(private deps: StorageControllerDeps) {
    super();
  }

  // QUERY ENDPOINTS

  /** GET /api/storage */
  async getCurrentStorage(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const labId = this.extractLabId(req);

      const configuration = await this.deps.getCurrentStorageHandler.handle({ labId });
      const configurationResponse = StorageDto.toResponse(configuration);

      if (user.isDemo) {
        const lab = await this.deps.labRepository.findById(labId);
        if (lab?.demoLimits) {
          configurationResponse.configuration.currentLab.demoLimits = lab.demoLimits;
        }
      }

      res.json(ResponseBuilder.success(configurationResponse));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get current configuration');
    }
  }

  /** GET /api/storage/history */
  async getStorageHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const labId = this.extractLabId(req);
      const history = await this.deps.getStorageHistoryHandler.handle({ labId, limit });

      res.json(ResponseBuilder.success({
        configurations: history.map(config => ({
          version: config.version,
          lastUpdated: config.timestamp,
          systemSettings: config.storage.systemSettings
        })),
        pagination: { limit, total: history.length }
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration history');
    }
  }

  /** GET /api/storage/version/:version */
  async getStorageByVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = parseInt(req.params.version);

      if (isNaN(version) || version < 1) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'Invalid version number. Must be a positive integer.'));
        return;
      }

      const labId = this.extractLabId(req);
      const configuration = await this.deps.getStorageByVersionHandler.handle({ labId, version });

      res.json(ResponseBuilder.success({
        version: configuration.version,
        lastUpdated: configuration.updatedAt,
        systemSettings: configuration.systemSettings,
        equipment: configuration.equipment
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration version');
    }
  }

  /** GET /api/storage/version */
  async getStorageVersion(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const configuration = await this.deps.getCurrentStorageHandler.handle({ labId });

      res.json(ResponseBuilder.success({
        version: configuration.version,
        updatedAt: configuration.updatedAt
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration version');
    }
  }

  /** GET /api/storage/health */
  async checkStorageHealth(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const health = await this.deps.checkStorageHealthHandler.handle({ labId });

      res.json(ResponseBuilder.success({
        status: health.isHealthy ? 'healthy' : 'unhealthy',
        version: health.version,
        lastUpdated: health.lastUpdated,
        issues: health.issues
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to check configuration health');
    }
  }

  // COMMAND ENDPOINTS

  /** PUT /api/storage/system */
  async updateSystemStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);

      const updatedStorage = await this.deps.updateSystemStorageHandler.handle({
        userId, labId, systemSettings: req.body
      });

      res.json(ResponseBuilder.success({
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt,
        systemSettings: updatedStorage.systemSettings
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update system configuration');
    }
  }

  /** POST /api/storage/reset */
  async resetStorageToDefault(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const confirmationToken = req.body.confirmationToken;

      if (!confirmationToken) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'Confirmation token required for configuration reset'));
        return;
      }

      const defaultStorage = await this.deps.resetStorageHandler.handle({
        userId, labId, confirmationToken
      });

      res.json(ResponseBuilder.success({
        message: 'Storage reset to defaults successfully',
        version: defaultStorage.version,
        lastUpdated: defaultStorage.updatedAt
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset configuration');
    }
  }

  /** POST /api/storage/import */
  async importStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const validateOnly = req.query.validateOnly === 'true';

      const result = await this.deps.importStorageHandler.handle({
        userId, labId, configurationData: req.body, validateOnly
      });

      if (!result.isValid) {
        res.status(400).json(ResponseBuilder.error(
          API_ERROR_CODES.VALIDATION_FAILED,
          'Storage import validation failed',
          { errors: result.errors, warnings: result.warnings }
        ));
        return;
      }

      res.json(ResponseBuilder.success({
        warnings: result.warnings,
        message: validateOnly
          ? 'Storage validation successful'
          : 'Storage imported successfully',
        ...(result.configuration && {
          configuration: {
            version: result.configuration.version,
            lastUpdated: result.configuration.updatedAt
          }
        })
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to import configuration');
    }
  }

  /** PUT /api/storage/box-position-display */
  async updateBoxPositionDisplay(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId, positionDisplay } = req.body;

      if (!tankId || !rackId || !boxId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'tankId, rackId, and boxId are required'));
        return;
      }

      const labId = this.extractLabId(req);

      const updatedStorage = await this.deps.updateBoxPositionDisplayHandler.handle({
        userId, labId, tankId, rackId, boxId, positionDisplay: positionDisplay || null
      });

      res.json(ResponseBuilder.success({
        message: `Position display updated for box ${boxId}`,
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update box position display');
    }
  }

  /** PUT /api/storage/lab-position-display */
  async updateLabDefaultPositionDisplay(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { positionDisplay } = req.body;

      const updatedStorage = await this.deps.updateLabDefaultPositionDisplayHandler.handle({
        userId, labId, positionDisplay: positionDisplay || null
      });

      res.json(ResponseBuilder.success({
        message: positionDisplay
          ? `Lab default position display updated to ${positionDisplay.format}`
          : 'Lab default position display cleared',
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update lab default position display');
    }
  }

  /**
   * PUT /api/storage/resource-label
   *
   * Uses fine-grained permissions (canEditResource) rather than admin-only config
   * management permissions, allowing resource owners to set their own labels.
   */
  async updateResourceLabel(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { resourceType, tankId, rackId, boxId, customLabel } = req.body;

      if (!resourceType || !['rack', 'box'].includes(resourceType)) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'resourceType must be "rack" or "box"'));
        return;
      }

      if (!tankId || !rackId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'tankId and rackId are required'));
        return;
      }

      if (resourceType === 'box' && !boxId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'boxId is required for box label updates'));
        return;
      }

      const labId = this.extractLabId(req);

      const updatedStorage = await this.deps.updateResourceLabelHandler.handle({
        userId, labId, resourceType, tankId, rackId, boxId, customLabel
      });

      res.json(ResponseBuilder.success({
        message: `Label updated for ${resourceType} ${resourceType === 'box' ? boxId : rackId}`,
        version: updatedStorage.version,
        lastUpdated: updatedStorage.updatedAt
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update resource label');
    }
  }

  /** GET /api/storage/position-display-presets */
  async getPositionDisplayPresets(req: Request, res: Response): Promise<void> {
    try {
      res.json(ResponseBuilder.success({
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
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get position display presets');
    }
  }

  // TANK ENDPOINTS

  /** POST /api/storage/tanks */
  async addTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name, location } = req.body;

      if (!name) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'name is required'));
        return;
      }

      const labId = this.extractLabId(req);
      const result = await this.deps.addTankHandler.handle({ userId, labId, name, location });

      res.status(201).json(ResponseBuilder.success({ tankId: result.tankId }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add tank');
    }
  }

  /** PUT /api/storage/tanks/:tankId */
  async updateTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { name, location, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateTankHandler.handle({ userId, labId, tankId, name, location, isActive });

      res.json(ResponseBuilder.success({ message: `Tank '${tankId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update tank');
    }
  }

  /** DELETE /api/storage/tanks/:tankId */
  async deleteTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const tankId = req.params.tankId;

      await this.deps.deleteTankHandler.handle({ userId, labId, tankId });

      res.json(ResponseBuilder.success({ message: `Tank '${tankId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete tank');
    }
  }

  // RACK ENDPOINTS

  /** POST /api/storage/tanks/:tankId/racks */
  async addRacks(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { count = 1 } = req.body;
      const labId = this.extractLabId(req);

      const result = await this.deps.addRacksHandler.handle({ userId, labId, tankId, count });

      res.status(201).json(ResponseBuilder.success({ rackIds: result.rackIds }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add rack(s)');
    }
  }

  /** PUT /api/storage/tanks/:tankId/racks/:rackId */
  async updateRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { name, capacity, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateRackHandler.handle({ userId, labId, tankId, rackId, name, capacity, isActive });

      res.json(ResponseBuilder.success({ message: `Rack '${rackId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update rack');
    }
  }

  /** DELETE /api/storage/tanks/:tankId/racks/:rackId */
  async deleteRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId } = req.params;

      await this.deps.deleteRackHandler.handle({ userId, labId, tankId, rackId });

      res.json(ResponseBuilder.success({ message: `Rack '${rackId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete rack');
    }
  }

  /** PUT /api/storage/tanks/:tankId/racks/:rackId/assign */
  async assignRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { assignedUserId } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.assignRackHandler.handle({
        userId, labId, tankId, rackId, assignedUserId: assignedUserId ?? null
      });

      res.json(ResponseBuilder.success({
        message: assignedUserId
          ? `Rack '${rackId}' assigned to user`
          : `Rack '${rackId}' unassigned`
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to assign rack');
    }
  }

  // BOX ENDPOINTS

  /** POST /api/storage/tanks/:tankId/racks/:rackId/boxes */
  async addBoxes(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { count = 1 } = req.body;
      const labId = this.extractLabId(req);

      const result = await this.deps.addBoxesHandler.handle({ userId, labId, tankId, rackId, count });

      res.status(201).json(ResponseBuilder.success({ boxIds: result.boxIds }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add box(es)');
    }
  }

  /** PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId */
  async updateBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { name, gridConfig, positionDisplay, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateBoxHandler.handle({
        userId, labId, tankId, rackId, boxId, name, gridConfig, positionDisplay, isActive
      });

      res.json(ResponseBuilder.success({ message: `Box '${boxId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update box');
    }
  }

  /** DELETE /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId */
  async deleteBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId, boxId } = req.params;

      await this.deps.deleteBoxHandler.handle({ userId, labId, tankId, rackId, boxId });

      res.json(ResponseBuilder.success({ message: `Box '${boxId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete box');
    }
  }

  /** PUT /api/storage/tanks/:tankId/racks/:rackId/boxes/:boxId/assign */
  async assignBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { assignedUserId } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.assignBoxHandler.handle({
        userId, labId, tankId, rackId, boxId, assignedUserId: assignedUserId ?? null
      });

      res.json(ResponseBuilder.success({
        message: assignedUserId
          ? `Box '${boxId}' assigned to user`
          : `Box '${boxId}' unassigned`
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to assign box');
    }
  }

  // BULK ASSIGNMENT ENDPOINTS

  /** POST /api/storage/bulk-unassign */
  async bulkUnassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId } = req.body;

      if (!fromUserId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'fromUserId is required'));
        return;
      }

      const labId = this.extractLabId(req);
      const result = await this.deps.bulkUnassignHandler.handle({ userId, labId, fromUserId });

      res.json(ResponseBuilder.success({
        racksAffected: result.racksAffected,
        boxesAffected: result.boxesAffected,
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk unassign resources');
    }
  }

  /** POST /api/storage/bulk-reassign */
  async bulkReassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId, toUserId } = req.body;

      if (!fromUserId || !toUserId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'fromUserId and toUserId are required'));
        return;
      }

      const labId = this.extractLabId(req);
      const result = await this.deps.bulkReassignHandler.handle({ userId, labId, fromUserId, toUserId });

      res.json(ResponseBuilder.success({
        racksAffected: result.racksAffected,
        boxesAffected: result.boxesAffected,
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk reassign resources');
    }
  }

  // INITIALIZE ENDPOINT

  /** POST /api/storage/initialize */
  async initializeStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labName, tankCount, racksPerTank, boxesPerRack } = req.body;

      if (!labName) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'labName is required'));
        return;
      }

      const labId = this.extractLabId(req);

      await this.deps.initializeConfigHandler.handle({
        userId, labId, labName, tankCount, racksPerTank, boxesPerRack
      });

      res.status(201).json(ResponseBuilder.success({
        message: `Storage initialized for lab '${labName}'`
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to initialize configuration');
    }
  }

  // SYSTEM ADMIN WRAPPERS (labId from URL params)

  async resetDemoDataForLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.resetDemoDataHandler.handle({ userId, labId });

      res.json(ResponseBuilder.success({
        message: 'Demo data reset successfully',
        deletedTubes: result.deletedTubes
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset demo data');
    }
  }

  async seedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.seedDemoHandler.handle({ userId, labId });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to seed demo lab');
    }
  }

  async unseedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.unseedDemoHandler.handle({ userId, labId });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to unseed demo lab');
    }
  }
}
