/**
 * Reagent Queries
 *
 * Reads the reagent category tree, the item list with its lot rollup, the
 * per-item detail aggregate, and an item's full stock ledger.
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

export function useReagentItemDetailQuery(id: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.reagents.detail(labId, id ?? ''),
    queryFn: () => ReagentService.getById(id!),
    enabled: !!labId && !!id,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: 'always',
  });
}

/** Bottle labels for the given items. Pass a sorted list — it is part of the cache key. */
export function useReagentLotLabelsQuery(itemIds: string[], enabled: boolean) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.reagents.lotLabels(labId, itemIds),
    queryFn: () => ReagentService.bulkGetLotLabels(itemIds),
    enabled: enabled && !!labId && itemIds.length > 0,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

// Unpaged: a FEFO movement's rows are grouped for display, and a cut through one
// would show a partial sum.
export function useReagentTransactionHistoryQuery(itemId: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.reagents.transactions(labId, itemId ?? ''),
    queryFn: () => ReagentService.getTransactionHistory(itemId!),
    enabled: !!labId && !!itemId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: 'always',
  });
}
