/**
 * Admin Catalog Values Query
 *
 * Loads every lookup-value category in one request for the catalog editor.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminService } from '../services/AdminService';

import type { LookupCategory, LookupValueWithCount } from '@odysseus/shared-schemas';

export type CatalogValues = Record<LookupCategory, LookupValueWithCount[]>;

const CATALOG_CATEGORIES: LookupCategory[] = [
  'species',
  'source',
  'media',
  'specimen_type',
  'equipment_maintenance_type',
  'supply_item_property',
  'supply_stock_unit',
  'supply_vendor',
  'supply_manufacturer',
];

export const EMPTY_CATALOG: CatalogValues = {
  species: [],
  source: [],
  media: [],
  specimen_type: [],
  equipment_maintenance_type: [],
  supply_item_property: [],
  supply_stock_unit: [],
  supply_vendor: [],
  supply_manufacturer: [],
};

export function useCatalogValuesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.admin.catalog(labId),
    queryFn: async (): Promise<CatalogValues> => {
      const results = await Promise.all(
        CATALOG_CATEGORIES.map(category => adminService.getLookupValues(category))
      );
      return Object.fromEntries(
        CATALOG_CATEGORIES.map((category, index) => [category, results[index]])
      ) as CatalogValues;
    },
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
