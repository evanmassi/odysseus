/**
 * User Lookup Query Hook
 *
 * Resolves a list of user IDs to display info for storage ownership display.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { MS_PER_MINUTE, MS_PER_HOUR } from '@shared/utils';

import { userLookupService } from '../services/UserLookupService';

export function useUserLookupQuery(userIds: string[]) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.users.lookup(labId, userIds),
    queryFn: () => userLookupService.lookupUsers(userIds),
    enabled: userIds.length > 0,
    staleTime: 30 * MS_PER_MINUTE,
    gcTime: MS_PER_HOUR,
  });
}
