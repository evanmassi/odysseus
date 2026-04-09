/**
 * Consumable Query Hooks
 *
 * React Query hooks for fetching consumable categories, products, locations, and reorder list.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ConsumableService } from '../services/ConsumableService';

export function useConsumableCategoriesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.categories(labId),
    queryFn: () => ConsumableService.listCategories(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useConsumableProductsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.products(labId),
    queryFn: () => ConsumableService.listProducts(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useConsumableProductDetailQuery(id: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.detail(labId, id ?? ''),
    queryFn: () => ConsumableService.getById(id!),
    enabled: !!labId && !!id,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: 'always',
  });
}

export function useConsumableLocationsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.locations(labId),
    queryFn: () => ConsumableService.listLocations(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useConsumableTransactionHistoryQuery(productId: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.transactions(labId, productId ?? ''),
    queryFn: () => ConsumableService.getTransactionHistory(productId!),
    enabled: !!labId && !!productId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useConsumableReorderListQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.consumables.reorderList(labId),
    queryFn: () => ConsumableService.getReorderList(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
