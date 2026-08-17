/**
 * Storage Management Controller
 *
 * HTTP handlers for storage configuration, tank/rack/box CRUD, and bulk assignment operations.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type {
  AddBoxesCommandHandler,
  UpdateBoxCommandHandler,
  DeleteBoxCommandHandler,
  AssignBoxCommandHandler,
} from '@application/commands/BoxCommands';
import type {
  BulkUnassignResourcesCommandHandler,
  BulkReassignResourcesCommandHandler,
} from '@application/commands/BulkAssignmentCommands';
import type {
  ResetDemoDataCommandHandler,
  SeedDemoCommandHandler,
  UnseedDemoCommandHandler,
} from '@application/commands/DemoSeedCommands';
import type { InitializeStorageCommandHandler } from '@application/commands/InitializeStorageCommand';
import type {
  AddRacksCommandHandler,
  UpdateRackCommandHandler,
  DeleteRackCommandHandler,
  AssignRackCommandHandler,
} from '@application/commands/RackCommands';
import type {
  UpdateSystemStorageCommandHandler,
  ResetStorageToDefaultCommandHandler,
  ImportStorageCommandHandler,
  UpdateResourceLabelCommandHandler,
} from '@application/commands/StorageCommands';
import type {
  AddTankCommandHandler,
  UpdateTankCommandHandler,
  DeleteTankCommandHandler,
} from '@application/commands/TankCommands';
import { StorageDto } from '@application/dto/StorageDto';
import type {
  GetCurrentStorageQueryHandler,
  GetStorageHistoryQueryHandler,
  GetStorageByVersionQueryHandler,
  CheckStorageHealthQueryHandler,
} from '@application/queries/StorageQueries';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface StorageControllerDeps {
  getCurrentStorageHandler: GetCurrentStorageQueryHandler;
  getStorageHistoryHandler: GetStorageHistoryQueryHandler;
  getStorageByVersionHandler: GetStorageByVersionQueryHandler;
  checkStorageHealthHandler: CheckStorageHealthQueryHandler;
  updateSystemStorageHandler: UpdateSystemStorageCommandHandler;
  resetStorageHandler: ResetStorageToDefaultCommandHandler;
  importStorageHandler: ImportStorageCommandHandler;
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
}

export class StorageController extends BaseController {
  constructor(private deps: StorageControllerDeps) {
    super();
  }

  // QUERY ENDPOINTS

  async getCurrentStorage(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const labId = this.extractLabId(req);

      const { storage, demoLimits } = await this.deps.getCurrentStorageHandler.handle({
        labId,
        includeDemoLimits: user.isDemo,
      });
      const configurationResponse = StorageDto.toResponse(storage);

      if (demoLimits) {
        configurationResponse.configuration.currentLab.demoLimits = demoLimits;
      }

      res.json(ResponseBuilder.success(configurationResponse));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get current configuration', req.requestId);
    }
  }

  async getStorageHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const labId = this.extractLabId(req);
      const history = await this.deps.getStorageHistoryHandler.handle({ labId, limit });

      res.json(
        ResponseBuilder.success({
          configurations: history.map(config => ({
            version: config.version,
            lastUpdated: config.timestamp,
            systemSettings: config.storage.systemSettings,
          })),
          pagination: { limit, total: history.length },
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration history', req.requestId);
    }
  }

  async getStorageByVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = parseInt(req.params.version);

      if (isNaN(version) || version < 1) {
        res
          .status(400)
          .json(
            ResponseBuilder.error(
              API_ERROR_CODES.INVALID_INPUT,
              'Invalid version number. Must be a positive integer.'
            )
          );
        return;
      }

      const labId = this.extractLabId(req);
      const configuration = await this.deps.getStorageByVersionHandler.handle({ labId, version });

      res.json(
        ResponseBuilder.success({
          version: configuration.version,
          lastUpdated: configuration.updatedAt,
          systemSettings: configuration.systemSettings,
          equipment: configuration.equipment,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration version', req.requestId);
    }
  }

  async getStorageVersion(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { storage } = await this.deps.getCurrentStorageHandler.handle({ labId });

      res.json(
        ResponseBuilder.success({
          version: storage.version,
          updatedAt: storage.updatedAt,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to get configuration version', req.requestId);
    }
  }

  async checkStorageHealth(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const health = await this.deps.checkStorageHealthHandler.handle({ labId });

      res.json(
        ResponseBuilder.success({
          status: health.isHealthy ? 'healthy' : 'unhealthy',
          version: health.version,
          lastUpdated: health.lastUpdated,
          issues: health.issues,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to check configuration health', req.requestId);
    }
  }

  // COMMAND ENDPOINTS

  async updateSystemStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);

      const updatedStorage = await this.deps.updateSystemStorageHandler.handle({
        userId,
        labId,
        systemSettings: req.body,
      });

      res.json(
        ResponseBuilder.success({
          version: updatedStorage.version,
          lastUpdated: updatedStorage.updatedAt,
          systemSettings: updatedStorage.systemSettings,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to update system configuration', req.requestId);
    }
  }

  async resetStorageToDefault(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const confirmationToken = req.body.confirmationToken;

      const defaultStorage = await this.deps.resetStorageHandler.handle({
        userId,
        labId,
        confirmationToken,
      });

      res.json(
        ResponseBuilder.success({
          message: 'Storage reset to defaults successfully',
          version: defaultStorage.version,
          lastUpdated: defaultStorage.updatedAt,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset configuration', req.requestId);
    }
  }

  async importStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const validateOnly = req.query.validateOnly === 'true';

      const result = await this.deps.importStorageHandler.handle({
        userId,
        labId,
        configurationData: req.body,
        validateOnly,
      });

      if (!result.isValid) {
        res
          .status(400)
          .json(
            ResponseBuilder.error(
              API_ERROR_CODES.VALIDATION_FAILED,
              'Storage import validation failed',
              { errors: result.errors, warnings: result.warnings }
            )
          );
        return;
      }

      res.json(
        ResponseBuilder.success({
          warnings: result.warnings,
          message: validateOnly ? 'Storage validation successful' : 'Storage imported successfully',
          ...(result.configuration && {
            configuration: {
              version: result.configuration.version,
              lastUpdated: result.configuration.updatedAt,
            },
          }),
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to import configuration', req.requestId);
    }
  }

  /**
   * Uses fine-grained permissions (canEditResource) rather than admin-only config
   * management permissions, allowing resource owners to set their own labels.
   */
  async updateResourceLabel(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { resourceType, tankId, rackId, boxId, customLabel } = req.body;

      const labId = this.extractLabId(req);

      const updatedStorage = await this.deps.updateResourceLabelHandler.handle({
        userId,
        labId,
        resourceType,
        tankId,
        rackId,
        boxId,
        customLabel,
      });

      res.json(
        ResponseBuilder.success({
          message: `Label updated for ${resourceType} ${resourceType === 'box' ? boxId : rackId}`,
          version: updatedStorage.version,
          lastUpdated: updatedStorage.updatedAt,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to update resource label', req.requestId);
    }
  }

  // TANK ENDPOINTS

  async addTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name } = req.body;

      const labId = this.extractLabId(req);
      const result = await this.deps.addTankHandler.handle({ userId, labId, name });

      res.status(201).json(ResponseBuilder.success({ tankId: result.tankId }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add tank', req.requestId);
    }
  }

  async updateTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { name, location, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateTankHandler.handle({ userId, labId, tankId, name, location, isActive });

      res.json(ResponseBuilder.success({ message: `Tank '${tankId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update tank', req.requestId);
    }
  }

  async deleteTank(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const tankId = req.params.tankId;

      await this.deps.deleteTankHandler.handle({ userId, labId, tankId });

      res.json(ResponseBuilder.success({ message: `Tank '${tankId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete tank', req.requestId);
    }
  }

  // RACK ENDPOINTS

  async addRacks(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const tankId = req.params.tankId;
      const { count = 1 } = req.body;
      const labId = this.extractLabId(req);

      const result = await this.deps.addRacksHandler.handle({ userId, labId, tankId, count });

      res.status(201).json(ResponseBuilder.success({ rackIds: result.rackIds }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add rack(s)', req.requestId);
    }
  }

  async updateRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { name, capacity, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateRackHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        name,
        capacity,
        isActive,
      });

      res.json(ResponseBuilder.success({ message: `Rack '${rackId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update rack', req.requestId);
    }
  }

  async deleteRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId } = req.params;

      await this.deps.deleteRackHandler.handle({ userId, labId, tankId, rackId });

      res.json(ResponseBuilder.success({ message: `Rack '${rackId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete rack', req.requestId);
    }
  }

  async assignRack(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { assignedUserId } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.assignRackHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        assignedUserId: assignedUserId ?? null,
      });

      res.json(
        ResponseBuilder.success({
          message: assignedUserId
            ? `Rack '${rackId}' assigned to user`
            : `Rack '${rackId}' unassigned`,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to assign rack', req.requestId);
    }
  }

  // BOX ENDPOINTS

  async addBoxes(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId } = req.params;
      const { count = 1 } = req.body;
      const labId = this.extractLabId(req);

      const result = await this.deps.addBoxesHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        count,
      });

      res.status(201).json(ResponseBuilder.success({ boxIds: result.boxIds }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add box(es)', req.requestId);
    }
  }

  async updateBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { name, gridConfig, positionDisplay, isActive } = req.body;
      const labId = this.extractLabId(req);

      await this.deps.updateBoxHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        boxId,
        name,
        gridConfig,
        positionDisplay,
        isActive,
      });

      res.json(ResponseBuilder.success({ message: `Box '${boxId}' updated` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update box', req.requestId);
    }
  }

  async deleteBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = this.extractLabId(req);
      const { tankId, rackId, boxId } = req.params;

      await this.deps.deleteBoxHandler.handle({ userId, labId, tankId, rackId, boxId });

      res.json(ResponseBuilder.success({ message: `Box '${boxId}' deleted` }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete box', req.requestId);
    }
  }

  async assignBox(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { tankId, rackId, boxId } = req.params;
      const { assignedUserId } = req.body;
      const labId = this.extractLabId(req);

      // Passed through unflattened: an absent field means inherit, an explicit null means common.
      await this.deps.assignBoxHandler.handle({
        userId,
        labId,
        tankId,
        rackId,
        boxId,
        assignedUserId,
      });

      res.json(
        ResponseBuilder.success({
          message: assignedUserId ? `Box '${boxId}' assigned to user` : `Box '${boxId}' unassigned`,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to assign box', req.requestId);
    }
  }

  // BULK ASSIGNMENT ENDPOINTS

  async bulkUnassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId } = req.body;

      const labId = this.extractLabId(req);
      const result = await this.deps.bulkUnassignHandler.handle({ userId, labId, fromUserId });

      res.json(
        ResponseBuilder.success({
          racksAffected: result.racksAffected,
          boxesAffected: result.boxesAffected,
          protectedSkipped: result.protectedSkipped,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk unassign resources', req.requestId);
    }
  }

  async bulkReassignResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { fromUserId, toUserId } = req.body;

      const labId = this.extractLabId(req);
      const result = await this.deps.bulkReassignHandler.handle({
        userId,
        labId,
        fromUserId,
        toUserId,
      });

      res.json(
        ResponseBuilder.success({
          racksAffected: result.racksAffected,
          boxesAffected: result.boxesAffected,
          protectedSkipped: result.protectedSkipped,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk reassign resources', req.requestId);
    }
  }

  // INITIALIZE ENDPOINT

  async initializeStorage(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labName, tankCount, racksPerTank, boxesPerRack } = req.body;

      const labId = this.extractLabId(req);

      await this.deps.initializeConfigHandler.handle({
        userId,
        labId,
        labName,
        tankCount,
        racksPerTank,
        boxesPerRack,
      });

      res.status(201).json(
        ResponseBuilder.success({
          message: `Storage initialized for lab '${labName}'`,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to initialize configuration', req.requestId);
    }
  }

  // SYSTEM ADMIN WRAPPERS (labId from URL params)

  async resetDemoDataForLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.resetDemoDataHandler.handle({ userId, labId });

      res.json(
        ResponseBuilder.success({
          message: 'Demo data reset successfully',
          restored: result.restored,
        })
      );
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset demo data', req.requestId);
    }
  }

  async seedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.seedDemoHandler.handle({ userId, labId });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to seed demo lab', req.requestId);
    }
  }

  async unseedDemoLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { labId } = req.params;

      const result = await this.deps.unseedDemoHandler.handle({ userId, labId });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to unseed demo lab', req.requestId);
    }
  }
}
