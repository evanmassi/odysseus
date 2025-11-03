/**
 * Resource Route Module
 *
 * Handles business resource routes (Tubes, Researchers).
 * These routes require authentication and operate on domain resources.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { TubeController } from '@presentation/controllers/TubeController';
import { ResearcherController } from '@presentation/controllers/ResearcherController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { createRateLimitMiddleware } from '@middleware/RateLimiting';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { validateBody, validateParams, validateQuery } from '@middleware/Validation';
import { CreateTubeHttpSchema, UpdateTubeHttpSchema, CreateResearcherHttpSchema, BulkUpdateHttpSchema, LocationQuerySchema } from '@validation/schemas';

export class ResourceRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private tubeController: TubeController,
    private researcherController: ResearcherController,
    private authMiddleware: AuthMiddleware,
    configurationRepository: ConfigurationRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(configurationRepository);
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

    // Standardized location endpoint
    router.get('/tubes/location', 
      validateQuery(LocationQuerySchema),
      this.tubeController.getTubesByLocation.bind(this.tubeController)
    );

    router.get('/tubes/search', 
      this.tubeController.searchTubes.bind(this.tubeController)
    );

    router.get('/tubes/rack/:rackId/box/:boxId', 
      validateParams(z.object({ 
        rackId: z.string(), 
        boxId: z.string() 
      })),
      this.tubeController.getTubesByRackAndBox.bind(this.tubeController)
    );

    router.get('/tubes/:id', 
      validateParams(z.object({ id: z.string().min(1) })),
      this.tubeController.getTubeById.bind(this.tubeController)
    );

    // Write operations
    router.post('/tubes', 
      validateBody(CreateTubeHttpSchema),
      this.tubeController.createTube.bind(this.tubeController)
    );

    router.put('/tubes/:id', 
      validateParams(z.object({ id: z.string().min(1) })),
      validateBody(UpdateTubeHttpSchema),
      this.tubeController.updateTube.bind(this.tubeController)
    );

    router.delete('/tubes/:id', 
      validateParams(z.object({ id: z.string().min(1) })),
      this.tubeController.deleteTube.bind(this.tubeController)
    );

    router.post('/tubes/bulk-update',
      validateBody(BulkUpdateHttpSchema),
      this.tubeController.bulkUpdateTubes.bind(this.tubeController)
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
      validateParams(z.object({ id: z.string() })),
      this.researcherController.getResearcherById.bind(this.researcherController)
    );

    router.get('/researchers/:id/tubes/count',
      validateParams(z.object({ id: z.string() })),
      this.researcherController.getResearcherTubeCount.bind(this.researcherController)
    );

    // Write operations
    router.post('/researchers',
      validateBody(CreateResearcherHttpSchema),
      this.researcherController.createResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id', 
      validateParams(z.object({ id: z.string() })),
      this.researcherController.updateResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id/activate',
      validateParams(z.object({ id: z.string() })),
      this.researcherController.activateResearcher.bind(this.researcherController)
    );

    router.put('/researchers/:id/deactivate',
      validateParams(z.object({ id: z.string() })),
      this.researcherController.deactivateResearcher.bind(this.researcherController)
    );

    router.delete('/researchers/:id',
      validateParams(z.object({ id: z.string() })),
      this.researcherController.deleteResearcher.bind(this.researcherController)
    );
  }
}
