/**
 * Reagent Queries
 *
 * Reads the reagent category tree and the item list with its lot rollup.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ReagentService } from '../services/ReagentService';

export function useReagentCategoriesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.reagents.categories(labId),
    queryFn: () => ReagentService.listCategories(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useReagentItemsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.reagents.items(labId),
    queryFn: () => ReagentService.listItems(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
