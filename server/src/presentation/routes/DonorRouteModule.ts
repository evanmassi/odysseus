/**
 * Donor Route Module
 *
 * Routes for donor registry read, search, and admin CRUD operations.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { DonorController } from '@presentation/controllers/DonorController';
import { validateBody, validateParams, validateQuery } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  DonorHistoryIdParams,
  CreateDonorHttpSchema,
  UpdateDonorHttpSchema,
  CreateCollectionHistoryHttpSchema,
  DonorSearchQuery,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class DonorRouteModule implements RouteModule {

  constructor(
    private donorController: DonorController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/donors';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate.bind(this.authMiddleware)
    ];
  }

  configure(router: Router): void {

    // Read routes

    router.get('/',
      this.donorController.listDonors.bind(this.donorController)
    );

    router.get('/search',
      validateQuery(DonorSearchQuery),
      this.donorController.searchDonors.bind(this.donorController)
    );

    router.get('/:id',
      validateParams(IdParams),
      this.donorController.getDonor.bind(this.donorController)
    );

    router.get('/:id/collection-history',
      validateParams(IdParams),
      this.donorController.getCollectionHistory.bind(this.donorController)
    );

    // Admin write routes

    router.post('/',
      validateBody(CreateDonorHttpSchema),
      this.donorController.createDonor.bind(this.donorController)
    );

    router.put('/:id',
      validateParams(IdParams),
      validateBody(UpdateDonorHttpSchema),
      this.donorController.updateDonor.bind(this.donorController)
    );

    router.delete('/:id',
      validateParams(IdParams),
      this.donorController.deleteDonor.bind(this.donorController)
    );

    router.post('/:id/collection-history',
      validateParams(IdParams),
      validateBody(CreateCollectionHistoryHttpSchema),
      this.donorController.addCollectionHistory.bind(this.donorController)
    );

    router.delete('/collection-history/:historyId',
      validateParams(DonorHistoryIdParams),
      this.donorController.deleteCollectionHistory.bind(this.donorController)
    );
  }
}
