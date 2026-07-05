/**
 * Active Users Query Hook
 *
 * Fetches all active, approved users for user selection UIs.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { userLookupService } from '../services/UserLookupService';

export function useActiveUsersQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.users.list(labId),
    enabled: !!labId,
    queryFn: () => userLookupService.listActiveUsers(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
