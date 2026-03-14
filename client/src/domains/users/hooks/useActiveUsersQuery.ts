/**
 * Active Users Query Hook
 *
 * Fetches all active, approved users for user selection UIs.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore } from '@domains/authentication';

import { userLookupService } from '../services/UserLookupService';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

export function useActiveUsersQuery() {
  const labId = useAuthStore(s => s.user?.labId);

  return useQuery({
    queryKey: queryKeys.users.list(labId ?? ''),
    enabled: !!labId,
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      return userLookupService.listActiveUsers();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
