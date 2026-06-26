/**
 * Search Service
 *
 * Client-side search API with input validation and date normalization.
 */

import { SearchResultSchema, AdvancedSearchOptionsSchema } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { normalizeDateString } from '@shared/utils/dateFormatters';

import type { AdvancedSearchOptions, SearchResult } from '@odysseus/shared-schemas';

export class SearchService {
  static async searchTubes(options: AdvancedSearchOptions): Promise<SearchResult> {
    const validatedOptions = AdvancedSearchOptionsSchema.parse(options);

    // Normalize date filters to YYYY-MM-DD format to prevent timezone bugs
    const normalizedFilters = validatedOptions.filters
      ? {
          ...validatedOptions.filters,
          ...(validatedOptions.filters.dateFrom && {
            dateFrom: normalizeDateString(validatedOptions.filters.dateFrom),
          }),
          ...(validatedOptions.filters.dateTo && {
            dateTo: normalizeDateString(validatedOptions.filters.dateTo),
          }),
        }
      : undefined;

    const requestPayload = {
      query: validatedOptions.query,
      filters: normalizedFilters,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 limit is invalid, use default 50
      limit: validatedOptions.limit || 50,
      offset: validatedOptions.offset ?? 0,
      sortBy: validatedOptions.sortBy,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty sortOrder is invalid, default to 'desc'
      sortOrder: validatedOptions.sortOrder || 'desc',
    };

    return httpClient.postData('/search/tubes/advanced', requestPayload, SearchResultSchema);
  }
}
