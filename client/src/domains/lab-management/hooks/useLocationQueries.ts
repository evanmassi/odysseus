/**
 * Location Queries
 *
 * Reads the lab-wide location tree.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { LocationService } from '../services/LocationService';

export function useLocationsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.locations.all(labId),
    queryFn: () => LocationService.list(),
    enabled: !!labId,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
