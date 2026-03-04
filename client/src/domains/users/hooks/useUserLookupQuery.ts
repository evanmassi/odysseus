import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { userLookupService } from '../services/UserLookupService';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

/**
 * Hook to fetch display info for a list of user IDs
 *
 * Used by storage management to resolve ownership display.
 * Any authenticated user can use this hook.
 *
 * @param userIds - Array of user IDs to look up
 * @returns React Query result with user display info
 *
 * @example
 * ```tsx
 * const assignedUserIds = extractAssignedUserIds(lab);
 * const { data: users = [] } = useUserLookupQuery(assignedUserIds);
 * ```
 */
export function useUserLookupQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.users.lookup(userIds),
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      if (userIds.length === 0) return [];
      return userLookupService.lookupUsers(userIds);
    },
    enabled: userIds.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - display info rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
