/**
 * Donor Collection History Query
 *
 * Fetches a donor's collection events for the info panel timeline.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { DonorService } from '../services/DonorService';

export function useDonorCollectionHistoryQuery(donorId: string | undefined) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.donors.collectionHistory(labId, donorId ?? ''),
    queryFn: () => DonorService.getCollectionHistory(donorId ?? ''),
    enabled: !!labId && !!donorId,
  });
}
