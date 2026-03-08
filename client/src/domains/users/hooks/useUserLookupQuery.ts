/**
 * User Lookup Query Hook
 *
 * Resolves a list of user IDs to display info for storage ownership display.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { userLookupService } from '../services/UserLookupService';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

export function useUserLookupQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.users.lookup(userIds),
    queryFn: async (): Promise<UserDisplayInfo[]> => {
      return userLookupService.lookupUsers(userIds);
    },
    enabled: userIds.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
