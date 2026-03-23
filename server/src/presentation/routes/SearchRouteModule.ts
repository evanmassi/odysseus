/**
 * Search Route Module
 *
 * Handles search-related routes with proper authentication.
 */

import { AdvancedSearchOptionsSchema } from '@odysseus/shared-schemas';


import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SearchController } from '@presentation/controllers/SearchController';
import { createModerateRateLimiter } from '@presentation/middleware/apiRateLimiter';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import { validateBody, validateQuery } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  QuickSearchQuerySchema,
  FieldSearchBodySchema
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class SearchRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;
  private readonly moderateLimiter = createModerateRateLimiter();

  constructor(
    private readonly searchController: SearchController,
    private readonly authMiddleware: AuthMiddleware,
    storageRepository: StorageRepository
  ) {
    this.rateLimitMiddleware = createRateLimitMiddleware(storageRepository);
  }

  getBasePath(): string {
    return '/api/search';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.rateLimitMiddleware
    ];
  }

  configure(router: Router): void {
    router.post('/tubes/advanced',
      this.moderateLimiter,
      validateBody(AdvancedSearchOptionsSchema),
      this.searchController.advancedSearch.bind(this.searchController)
    );

    router.get('/quick',
      this.moderateLimiter,
      validateQuery(QuickSearchQuerySchema),
      this.searchController.quickSearch.bind(this.searchController)
    );

    router.post('/field',
      this.moderateLimiter,
      validateBody(FieldSearchBodySchema),
      this.searchController.fieldSearch.bind(this.searchController)
    );
  }
}
