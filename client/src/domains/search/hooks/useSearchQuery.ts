import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { SearchService } from '../services/SearchService';

import type { AdvancedSearchOptions } from '@odysseus/shared-schemas';

/**
 * Search Query Hook
 *
 * Performs search with filters, pagination, and sorting.
 */
export const useSearchTubesQuery = (
  options: AdvancedSearchOptions,
  config?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  const queryKey = queryKeys.search.tubesSearch(options);

  return useQuery({
    queryKey,
    queryFn: () => SearchService.searchTubes(options),
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  });
};
