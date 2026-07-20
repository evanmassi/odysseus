/**
 * Donors List Query
 *
 * Fetches all donors with tube counts for the donor registry table.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { MS_PER_MINUTE } from '@shared/utils';

import { DonorService } from '../services/DonorService';

export function useDonorsQuery(options?: { enabled?: boolean }) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.donors.list(labId),
    queryFn: () => DonorService.list(),
    enabled: !!labId && (options?.enabled ?? true),
    staleTime: 5 * MS_PER_MINUTE,
  });
}
