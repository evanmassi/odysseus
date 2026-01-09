/**
 * Search Route Module
 *
 * Handles search-related routes with proper authentication.
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { RouteModule } from '@presentation/routes/RouteModule';
import { SearchController } from '@presentation/controllers/SearchController';
import { AuthMiddleware } from '@infrastructure/security/AuthMiddleware';
import { createRateLimitMiddleware } from '@middleware/RateLimiting';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { validateBody, validateParams, validateQuery } from '@middleware/Validation';
import { AdvancedSearchOptionsSchema } from '@odysseus/shared-schemas';

export class SearchRouteModule implements RouteModule {
  private readonly rateLimitMiddleware: RequestHandler;

  constructor(
    private readonly searchController: SearchController,
    private readonly authMiddleware: AuthMiddleware,
    configurationRepository: ConfigurationRepository
  ) {
    // Create rate limit middleware with injected repository
    this.rateLimitMiddleware = createRateLimitMiddleware(configurationRepository);
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
    // Advanced search - Use shared schema for consistency
    router.post('/tubes/advanced',
      validateBody(AdvancedSearchOptionsSchema),
      this.searchController.advancedSearch.bind(this.searchController)
    );

    // Quick search
    router.get('/quick',
      validateQuery(z.object({
        q: z.string().min(1),
        limit: z.string().optional(),
      })),
      this.searchController.quickSearch.bind(this.searchController)
    );

    // Field search
    router.post('/field',
      validateBody(z.object({
        field: z.string().min(1),
        value: z.string().min(1),
        exact: z.boolean().optional(),
        limit: z.number().min(1).max(1000).optional(),
        offset: z.number().min(0).optional(),
      })),
      this.searchController.fieldSearch.bind(this.searchController)
    );

    // Search suggestions
    router.get('/suggestions',
      validateQuery(z.object({
        q: z.string().min(1),
        field: z.string().optional(),
      })),
      this.searchController.getSuggestions.bind(this.searchController)
    );

    // Saved searches
    router.get('/saved',
      this.searchController.getSavedSearches.bind(this.searchController)
    );

    router.post('/save',
      validateBody(z.object({
        name: z.string().min(1),
        searchOptions: z.object({
          query: z.string().optional(),
          filters: z.any().optional(),
        }),
      })),
      this.searchController.saveSearch.bind(this.searchController)
    );

    router.delete('/saved/:searchId',
      validateParams(z.object({
        searchId: z.string().min(1),
      })),
      this.searchController.deleteSavedSearch.bind(this.searchController)
    );

    // Filter options
    router.get('/filter-options',
      this.searchController.getFilterOptions.bind(this.searchController)
    );
  }
}
