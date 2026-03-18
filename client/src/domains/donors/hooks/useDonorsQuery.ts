/**
 * Donors List Query
 *
 * Fetches all donors with tube counts for the donor registry table.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { DonorService } from '../services/DonorService';

export function useDonorsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.donors.list(labId),
    queryFn: () => DonorService.list(),
    enabled: !!labId,
    staleTime: 5 * 60 * 1000,
  });
}
