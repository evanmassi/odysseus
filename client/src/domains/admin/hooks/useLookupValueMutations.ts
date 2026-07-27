/**
 * Admin Lookup Value Mutations
 *
 * Create, rename, and delete catalog lookup values. A rename rewrites a different domain table per
 * category (tubes, donor collections, equipment logs, supplies, or reagents), so the cache
 * invalidation cascades to that table — otherwise referencing records keep showing the old name
 * until expiry.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminService } from '../services/AdminService';

import type { LookupCategory } from '@odysseus/shared-schemas';

const renameCascadeKeys = (category: LookupCategory, labId: string | undefined) => {
  switch (category) {
    case 'species':
    case 'source':
    case 'media':
      return [queryKeys.tubes.all(labId)];
    case 'specimen_type':
      return [queryKeys.donors.all(labId)];
    case 'equipment_maintenance_type':
      return [queryKeys.equipment.all(labId)];
    case 'supply_item_property':
    case 'supply_stock_unit':
    case 'supply_vendor':
    case 'supply_manufacturer':
      return [queryKeys.supplies.all(labId)];
    case 'reagent_type':
    case 'reagent_vendor':
    case 'reagent_manufacturer':
      return [queryKeys.reagents.all(labId)];
  }
};

export function useCreateLookupValueMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ category, value }: { category: LookupCategory; value: string }) =>
      adminService.createLookupValue(category, value),
    onSuccess: (_data, { category }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalog(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.byCategory(labId, category),
      });
    },
  });
}

export function useRenameLookupValueMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, value }: { category: LookupCategory; id: string; value: string }) =>
      adminService.renameLookupValue(id, value),
    onSuccess: (_data, { category }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalog(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all(labId) });
      for (const queryKey of renameCascadeKeys(category, labId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useDeleteLookupValueMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id }: { category: LookupCategory; id: string }) =>
      adminService.deleteLookupValue(id),
    onSuccess: (_data, { category }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalog(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.byCategory(labId, category),
      });
    },
  });
}
