/**
 * Admin Researchers Query
 *
 * Loads the current lab's researcher profiles with tube counts for admin management.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminResearcherService } from '../services/AdminResearcherService';

export function useAdminResearchersQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.admin.researchers(labId),
    queryFn: () => adminResearcherService.getResearchers(),
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
