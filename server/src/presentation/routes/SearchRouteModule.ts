/**
 * Search Route Module
 *
 * Handles search-related routes with proper authentication.
 */

import { Router, RequestHandler } from 'express';
import { RouteModule } from '@presentation/routes/RouteModule';
import { SearchController } from '@presentation/controllers/SearchController';
import { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import { createRateLimitMiddleware } from '@presentation/middleware/rateLimitMiddleware';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { validateBody, validateQuery } from '@presentation/middleware/requestValidation';
import { AdvancedSearchOptionsSchema } from '@odysseus/shared-schemas';
import {
  QuickSearchQuerySchema,
  FieldSearchBodySchema
} from '@presentation/validation/httpValidationSchemas';

export class SearchRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

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
      validateBody(AdvancedSearchOptionsSchema),
      this.searchController.advancedSearch.bind(this.searchController)
    );

    router.get('/quick',
      validateQuery(QuickSearchQuerySchema),
      this.searchController.quickSearch.bind(this.searchController)
    );

    router.post('/field',
      validateBody(FieldSearchBodySchema),
      this.searchController.fieldSearch.bind(this.searchController)
    );
  }
}
