/**
 * Active Users Query Hook
 *
 * Fetches all active, approved users for user selection UIs.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { userLookupService } from '../services/UserLookupService';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

export function useActiveUsersQuery() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      return userLookupService.listActiveUsers();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
