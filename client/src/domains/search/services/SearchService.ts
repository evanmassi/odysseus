import {
  SearchResultSchema,
  AdvancedSearchOptionsSchema
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api/httpClient';
import { InfrastructureError } from '@shared/errors/AppError';
import { normalizeDateString } from '@shared/utils/dateUtils';

import type {
  AdvancedSearchOptions,
  SearchResult} from '@odysseus/shared-schemas';

/**
 * Modern Search Service with Zod validation and proper error handling
 */
export class SearchService {
  /**
   * Perform advanced search across tubes
   */
  static async searchTubes(options: AdvancedSearchOptions): Promise<SearchResult> {
    try {
      const validatedOptions = AdvancedSearchOptionsSchema.parse(options);

      // Normalize date filters to YYYY-MM-DD format to prevent timezone bugs
      const normalizedFilters = validatedOptions.filters ? {
        ...validatedOptions.filters,
        ...(validatedOptions.filters.dateFrom && {
          dateFrom: normalizeDateString(validatedOptions.filters.dateFrom)
        }),
        ...(validatedOptions.filters.dateTo && {
          dateTo: normalizeDateString(validatedOptions.filters.dateTo)
        })
      } : undefined;

      const requestPayload = {
        query: validatedOptions.query,
        filters: normalizedFilters,
        limit: validatedOptions.limit || 50,
        offset: validatedOptions.offset ?? 0,
        sortBy: validatedOptions.sortBy,
        sortOrder: validatedOptions.sortOrder || 'desc'
      };

      const result = await httpClient.postData(
        '/search/tubes/advanced',
        requestPayload,
        SearchResultSchema
      );

      return result;
    } catch (error) {
      throw new InfrastructureError(
        'API_ERROR',
        'Failed to search tubes',
        { originalError: error, options }
      );
    }
  }
}
