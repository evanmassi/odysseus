/**
 * Storage Route Module
 *
 * Routes for storage configuration, tank/rack/box CRUD, and bulk assignment.
 */


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { StorageController } from '@presentation/controllers/StorageController';
import { createStrictRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  TankIdParams,
  RackIdParams,
  BoxIdParams,
  AddTankHttpSchema,
  UpdateTankHttpSchema,
  AddRacksHttpSchema,
  UpdateRackHttpSchema,
  AssignRackHttpSchema,
  AddBoxesHttpSchema,
  UpdateBoxHttpSchema,
  AssignBoxHttpSchema,
  UpdateResourceLabelHttpSchema,
  UpdateSystemStorageHttpSchema,
  InitializeStorageHttpSchema,
  BulkUnassignHttpSchema,
  BulkReassignHttpSchema,
  ResetStorageHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class StorageRouteModule implements RouteModule {
  private readonly strictLimiter = createStrictRateLimiter();

  constructor(
    private storageController: StorageController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/storage';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {

    // AUTHENTICATED ROUTES

    router.get('/',
      this.storageController.getCurrentStorage.bind(this.storageController)
    );

    router.get('/version',
      this.storageController.getStorageVersion.bind(this.storageController)
    );

    router.get('/health',
      this.storageController.checkStorageHealth.bind(this.storageController)
    );

    // Uses fine-grained canEditResource permission, not admin-only
    router.put('/resource-label',
      validateBody(UpdateResourceLabelHttpSchema),
      this.storageController.updateResourceLabel.bind(this.storageController)
    );

    // ADMIN ROUTES

    router.put('/system',
      this.authMiddleware.requireAdmin,
      validateBody(UpdateSystemStorageHttpSchema),
      this.storageController.updateSystemStorage.bind(this.storageController)
    );

    router.get('/history',
      this.authMiddleware.requireAdmin,
      this.storageController.getStorageHistory.bind(this.storageController)
    );

    router.get('/version/:version',
      this.authMiddleware.requireAdmin,
      this.storageController.getStorageByVersion.bind(this.storageController)
    );

    router.post('/reset',
      this.authMiddleware.requireAdmin,
      this.strictLimiter,
      validateBody(ResetStorageHttpSchema),
      this.storageController.resetStorageToDefault.bind(this.storageController)
    );

    router.post('/import',
      this.authMiddleware.requireAdmin,
      this.strictLimiter,
      this.storageController.importStorage.bind(this.storageController)
    );

    // TANK ROUTES

    router.post('/tanks',
      this.authMiddleware.requireAdmin,
      validateBody(AddTankHttpSchema),
      this.storageController.addTank.bind(this.storageController)
    );

    router.put('/tanks/:tankId',
      this.authMiddleware.requireAdmin,
      validateParams(TankIdParams),
      validateBody(UpdateTankHttpSchema),
      this.storageController.updateTank.bind(this.storageController)
    );

    // Blocked if tubes exist in the tank
    router.delete('/tanks/:tankId',
      this.authMiddleware.requireAdmin,
      validateParams(TankIdParams),
      this.storageController.deleteTank.bind(this.storageController)
    );

    // RACK ROUTES

    // Supports bulk creation via count parameter
    router.post('/tanks/:tankId/racks',
      this.authMiddleware.requireAdmin,
      validateParams(TankIdParams),
      validateBody(AddRacksHttpSchema),
      this.storageController.addRacks.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId',
      this.authMiddleware.requireAdmin,
      validateParams(RackIdParams),
      validateBody(UpdateRackHttpSchema),
      this.storageController.updateRack.bind(this.storageController)
    );

    // Blocked if tubes exist in the rack
    router.delete('/tanks/:tankId/racks/:rackId',
      this.authMiddleware.requireAdmin,
      validateParams(RackIdParams),
      this.storageController.deleteRack.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/assign',
      this.authMiddleware.requireAdmin,
      validateParams(RackIdParams),
      validateBody(AssignRackHttpSchema),
      this.storageController.assignRack.bind(this.storageController)
    );

    // BOX ROUTES

    // Supports bulk creation via count parameter
    router.post('/tanks/:tankId/racks/:rackId/boxes',
      this.authMiddleware.requireAdmin,
      validateParams(RackIdParams),
      validateBody(AddBoxesHttpSchema),
      this.storageController.addBoxes.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.authMiddleware.requireAdmin,
      validateParams(BoxIdParams),
      validateBody(UpdateBoxHttpSchema),
      this.storageController.updateBox.bind(this.storageController)
    );

    // Blocked if tubes exist in the box
    router.delete('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.authMiddleware.requireAdmin,
      validateParams(BoxIdParams),
      this.storageController.deleteBox.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId/assign',
      this.authMiddleware.requireAdmin,
      validateParams(BoxIdParams),
      validateBody(AssignBoxHttpSchema),
      this.storageController.assignBox.bind(this.storageController)
    );

    // BULK ASSIGNMENT ROUTES

    router.post('/bulk-unassign',
      this.authMiddleware.requireAdmin,
      validateBody(BulkUnassignHttpSchema),
      this.storageController.bulkUnassignResources.bind(this.storageController)
    );

    router.post('/bulk-reassign',
      this.authMiddleware.requireAdmin,
      validateBody(BulkReassignHttpSchema),
      this.storageController.bulkReassignResources.bind(this.storageController)
    );

    // INITIALIZE ROUTE

    router.post('/initialize',
      this.authMiddleware.requireAdmin,
      this.strictLimiter,
      validateBody(InitializeStorageHttpSchema),
      this.storageController.initializeStorage.bind(this.storageController)
    );
  }
}
