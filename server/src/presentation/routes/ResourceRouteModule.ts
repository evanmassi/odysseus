/**
 * Resource Route Module
 *
 * Authenticated routes for tubes, researchers, and lookup values.
 */


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { LookupValueController } from '@presentation/controllers/LookupValueController';
import type { ResearcherController } from '@presentation/controllers/ResearcherController';
import type { TubeController } from '@presentation/controllers/TubeController';
import type { TubeLockController } from '@presentation/controllers/TubeLockController';
import { createModerateRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import { validateBody, validateParams, validateQuery } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  IdParams,
  CategoryParams,
  CreateTubeHttpSchema,
  UpdateTubeHttpSchema,
  CreateResearcherHttpSchema,
  BulkUpdateHttpSchema,
  BulkDeleteHttpSchema,
  LocationQuerySchema,
  LockTubesHttpSchema,
  UnlockTubesHttpSchema,
  ShareTubeAccessHttpSchema,
  RevokeTubeAccessHttpSchema
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class ResourceRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;
  private readonly moderateLimiter = createModerateRateLimiter();

  constructor(
    private tubeController: TubeController,
    private tubeLockController: TubeLockController,
    private researcherController: ResearcherController,
    private lookupValueController: LookupValueController,
    private authMiddleware: AuthMiddleware,
    storageRepository: StorageRepository
  ) {
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository);
  }

  getBasePath(): string {
    return '/api';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.rateLimitMiddleware
    ];
  }

  configure(router: Router): void {
    // TUBE ROUTES

    // Read operations
    router.get('/tubes',
      this.tubeController.getAllTubes.bind(this.tubeController)
    );

    router.get('/tubes/location',
      validateQuery(LocationQuerySchema),
      this.tubeController.getTubesByLocation.bind(this.tubeController)
    );

    router.get('/tubes/search',
      this.tubeController.searchTubes.bind(this.tubeController)
    );

    router.get('/tubes/stats',
      this.tubeController.getStats.bind(this.tubeController)
    );

    router.get('/tubes/:id',
      validateParams(IdParams),
      this.tubeController.getTubeById.bind(this.tubeController)
    );

    // Write operations
    router.post('/tubes',
      validateBody(CreateTubeHttpSchema),
      this.tubeController.createTube.bind(this.tubeController)
    );

    router.put('/tubes/:id',
      validateParams(IdParams),
      validateBody(UpdateTubeHttpSchema),
      this.tubeController.updateTube.bind(this.tubeController)
    );

    router.delete('/tubes/:id',
      validateParams(IdParams),
      this.tubeController.deleteTube.bind(this.tubeController)
    );

    router.post('/tubes/bulk-update',
      this.moderateLimiter,
      validateBody(BulkUpdateHttpSchema),
      this.tubeController.bulkUpdateTubes.bind(this.tubeController)
    );

    router.post('/tubes/bulk-delete',
      this.moderateLimiter,
      validateBody(BulkDeleteHttpSchema),
      this.tubeController.bulkDeleteTubes.bind(this.tubeController)
    );

    // TUBE LOCK ROUTES

    router.post('/tubes/lock',
      validateBody(LockTubesHttpSchema),
      this.tubeLockController.lockTubes.bind(this.tubeLockController)
    );

    router.post('/tubes/unlock',
      validateBody(UnlockTubesHttpSchema),
      this.tubeLockController.unlockTubes.bind(this.tubeLockController)
    );

    router.post('/tubes/share-access',
      validateBody(ShareTubeAccessHttpSchema),
      this.tubeLockController.shareTubeAccess.bind(this.tubeLockController)
    );

    router.post('/tubes/revoke-access',
      validateBody(RevokeTubeAccessHttpSchema),
      this.tubeLockController.revokeTubeAccess.bind(this.tubeLockController)
    );

    // RESEARCHER ROUTES

    // Read operations
    router.get('/researchers',
      this.researcherController.getAllResearchers.bind(this.researcherController)
    );

    router.get('/researchers/search',
      this.researcherController.searchResearchers.bind(this.researcherController)
    );

    router.get('/researchers/stats',
      this.researcherController.getResearcherStats.bind(this.researcherController)
    );

    router.get('/researchers/:id',
      validateParams(IdParams),
      this.researcherController.getResearcherById.bind(this.researcherController)
    );

    router.get('/researchers/:id/tubes/count',
      validateParams(IdParams),
      this.researcherController.getResearcherTubeCount.bind(this.researcherController)
    );

    // Write operations
    router.post('/researchers',
      validateBody(CreateResearcherHttpSchema),
      this.researcherController.createResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id',
      validateParams(IdParams),
      this.researcherController.updateResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id/activate',
      validateParams(IdParams),
      this.researcherController.activateResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id/deactivate',
      validateParams(IdParams),
      this.researcherController.deactivateResearcher.bind(this.researcherController)
    );

    router.delete('/researchers/:id',
      validateParams(IdParams),
      this.researcherController.deleteResearcher.bind(this.researcherController)
    );

    // LOOKUP VALUE ROUTES (for form dropdowns)

    router.get('/lookups/:category',
      validateParams(CategoryParams),
      this.lookupValueController.getActiveValues.bind(this.lookupValueController)
    );
  }
}
