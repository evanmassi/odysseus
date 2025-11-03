import { useQuery } from '@tanstack/react-query';
import { SearchService } from '../services/SearchService';
import { AdvancedSearchOptions } from '@odysseus/shared-schemas';
import { queryKeys } from '@app/queryKeys';

/**
 * Advanced Search Hook
 *
 * Performs comprehensive search with filters, pagination, and sorting
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
    staleTime: config?.staleTime ?? 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Keep previous results while loading new ones
  });
};
