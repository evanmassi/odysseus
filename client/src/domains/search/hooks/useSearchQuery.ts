/**
 * Search Query Hook
 *
 * Runs the advanced tube search, cached per lab and search options.
 */

import { useQuery } from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { SearchService } from '../services/SearchService';

import type { AdvancedSearchOptions } from '@odysseus/shared-schemas';

export const useSearchQuery = (options: AdvancedSearchOptions, config?: { enabled?: boolean }) => {
  const labId = useLabId();
  const queryKey = queryKeys.search.tubesSearch(labId, options);

  return useQuery({
    queryKey,
    queryFn: () => SearchService.searchTubes(options),
    ...DOMAIN_QUERY_OPTIONS.search,
    enabled: !!labId && (config?.enabled ?? true),
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  });
};
