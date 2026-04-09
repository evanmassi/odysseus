/**
 * Supply Query Hooks
 *
 * React Query hooks for fetching supply categories, products, locations, and reorder list.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { SupplyService } from '../services/SupplyService';

export function useSupplyCategoriesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.categories(labId),
    queryFn: () => SupplyService.listCategories(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useSupplyProductsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.products(labId),
    queryFn: () => SupplyService.listProducts(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useSupplyProductDetailQuery(id: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.detail(labId, id ?? ''),
    queryFn: () => SupplyService.getById(id!),
    enabled: !!labId && !!id,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: 'always',
  });
}

export function useSupplyLocationsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.locations(labId),
    queryFn: () => SupplyService.listLocations(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useSupplyTransactionHistoryQuery(productId: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.transactions(labId, productId ?? ''),
    queryFn: () => SupplyService.getTransactionHistory(productId!),
    enabled: !!labId && !!productId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useSupplyReorderListQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.supplies.reorderList(labId),
    queryFn: () => SupplyService.getReorderList(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
