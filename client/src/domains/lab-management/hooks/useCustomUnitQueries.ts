/**
 * Custom Unit Queries
 *
 * Reads the lab's custom units, which every unit dropdown offers alongside the registry.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { CustomUnitService } from '../services/CustomUnitService';

export function useCustomUnitsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.customUnits.all(labId),
    queryFn: () => CustomUnitService.list(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
