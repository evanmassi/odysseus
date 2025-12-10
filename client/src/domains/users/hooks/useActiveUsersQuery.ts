import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';

import { userLookupService } from '../services/UserLookupService';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

/**
 * Hook to fetch all active, approved users
 *
 * Used by ShareAccessModal and StorageManagementModal for user selection.
 * Any authenticated user can use this hook.
 *
 * @returns React Query result with active users list
 *
 * @example
 * ```tsx
 * const { data: users = [], isLoading } = useActiveUsersQuery();
 * ```
 */
export function useActiveUsersQuery() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      return userLookupService.listActiveUsers();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user list changes infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
