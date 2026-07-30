/**
 * Attribute Queries
 *
 * Reads the lab's attribute definitions and options in one call — the option list is only
 * ever read next to the definition that owns it.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { AttributeService, type AttributeCatalogData } from '../services/AttributeService';

export const EMPTY_ATTRIBUTES: AttributeCatalogData = { definitions: [], options: [] };

export function useAttributesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.attributes.all(labId),
    queryFn: () => AttributeService.list(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
