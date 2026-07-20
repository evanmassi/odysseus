/**
 * Admin Unlinked Researchers Query
 *
 * Loads researcher profiles not yet linked to a user account, for the link-researcher modal.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminResearcherService } from '../services/AdminResearcherService';

export function useUnlinkedResearchersQuery(enabled: boolean) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.admin.unlinkedResearchers(labId),
    queryFn: () => adminResearcherService.getUnlinkedResearchers(),
    enabled,
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
  });
}
