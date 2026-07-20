/**
 * Equipment Query Hooks
 *
 * React Query hooks for fetching equipment categories, items, and maintenance logs.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { EquipmentService } from '../services/EquipmentService';

export function useEquipmentCategoriesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.equipment.categories(labId),
    queryFn: () => EquipmentService.listCategories(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useEquipmentItemsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.equipment.items(labId),
    queryFn: () => EquipmentService.list(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}

export function useEquipmentItemDetailQuery(id: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.equipment.detail(labId, id ?? ''),
    queryFn: () => EquipmentService.getById(id!),
    enabled: !!labId && !!id,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: 'always',
  });
}
