/**
 * Donor Search Query
 *
 * Debounced autocomplete search across donor source and internal IDs.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { DonorService } from '../services/DonorService';

export function useDonorSearchQuery(query: string, limit?: number) {
  const labId = useLabId();

  return useQuery({
    queryKey: [...queryKeys.donors.search(labId, query), limit] as const,
    queryFn: () => DonorService.search(query, limit),
    enabled: !!labId && query.length >= 2,
    staleTime: 30 * 1000,
  });
}
