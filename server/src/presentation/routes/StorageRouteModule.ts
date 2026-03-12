/**
 * Storage Route Module
 *
 * Routes for storage configuration, tank/rack/box CRUD, and bulk assignment.
 */

import { Router, RequestHandler } from 'express';
import { StorageController } from '@presentation/controllers/StorageController';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { RouteModule } from '@presentation/routes/RouteModule';

export class StorageRouteModule implements RouteModule {

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

    router.put('/box-position-display',
      this.storageController.updateBoxPositionDisplay.bind(this.storageController)
    );

    router.put('/lab-position-display',
      this.storageController.updateLabDefaultPositionDisplay.bind(this.storageController)
    );

    router.get('/position-display-presets',
      this.storageController.getPositionDisplayPresets.bind(this.storageController)
    );

    // Uses fine-grained canEditResource permission, not admin-only
    router.put('/resource-label',
      this.storageController.updateResourceLabel.bind(this.storageController)
    );

    // ADMIN ROUTES

    router.put('/system',
      this.authMiddleware.requireAdmin,
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
      this.storageController.resetStorageToDefault.bind(this.storageController)
    );

    router.post('/import',
      this.authMiddleware.requireAdmin,
      this.storageController.importStorage.bind(this.storageController)
    );

    // TANK ROUTES

    router.post('/tanks',
      this.authMiddleware.requireAdmin,
      this.storageController.addTank.bind(this.storageController)
    );

    router.put('/tanks/:tankId',
      this.authMiddleware.requireAdmin,
      this.storageController.updateTank.bind(this.storageController)
    );

    // Blocked if tubes exist in the tank
    router.delete('/tanks/:tankId',
      this.authMiddleware.requireAdmin,
      this.storageController.deleteTank.bind(this.storageController)
    );

    // RACK ROUTES

    // Supports bulk creation via count parameter
    router.post('/tanks/:tankId/racks',
      this.authMiddleware.requireAdmin,
      this.storageController.addRacks.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId',
      this.authMiddleware.requireAdmin,
      this.storageController.updateRack.bind(this.storageController)
    );

    // Blocked if tubes exist in the rack
    router.delete('/tanks/:tankId/racks/:rackId',
      this.authMiddleware.requireAdmin,
      this.storageController.deleteRack.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/assign',
      this.authMiddleware.requireAdmin,
      this.storageController.assignRack.bind(this.storageController)
    );

    // BOX ROUTES

    // Supports bulk creation via count parameter
    router.post('/tanks/:tankId/racks/:rackId/boxes',
      this.authMiddleware.requireAdmin,
      this.storageController.addBoxes.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.authMiddleware.requireAdmin,
      this.storageController.updateBox.bind(this.storageController)
    );

    // Blocked if tubes exist in the box
    router.delete('/tanks/:tankId/racks/:rackId/boxes/:boxId',
      this.authMiddleware.requireAdmin,
      this.storageController.deleteBox.bind(this.storageController)
    );

    router.put('/tanks/:tankId/racks/:rackId/boxes/:boxId/assign',
      this.authMiddleware.requireAdmin,
      this.storageController.assignBox.bind(this.storageController)
    );

    // BULK ASSIGNMENT ROUTES

    router.post('/bulk-unassign',
      this.authMiddleware.requireAdmin,
      this.storageController.bulkUnassignResources.bind(this.storageController)
    );

    router.post('/bulk-reassign',
      this.authMiddleware.requireAdmin,
      this.storageController.bulkReassignResources.bind(this.storageController)
    );

    // INITIALIZE ROUTE

    router.post('/initialize',
      this.authMiddleware.requireAdmin,
      this.storageController.initializeStorage.bind(this.storageController)
    );
  }
}
