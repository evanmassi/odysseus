/**
 * Active Users Query Hook
 *
 * Fetches all active, approved users for user selection UIs.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { MS_PER_MINUTE } from '@shared/utils';

import { UserLookupService } from '../services/UserLookupService';

export function useActiveUsersQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.users.list(labId),
    enabled: !!labId,
    queryFn: () => UserLookupService.listActiveUsers(),
    staleTime: 5 * MS_PER_MINUTE,
    gcTime: 30 * MS_PER_MINUTE,
  });
}
