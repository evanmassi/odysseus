/**
 * Donor Search Query
 *
 * Autocomplete search across donor source and internal IDs.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { MS_PER_SECOND } from '@shared/utils';

import { DonorService } from '../services/DonorService';

export function useDonorSearchQuery(query: string) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.donors.search(labId, query),
    queryFn: () => DonorService.search(query),
    enabled: !!labId && query.length >= 2,
    staleTime: 30 * MS_PER_SECOND,
  });
}
