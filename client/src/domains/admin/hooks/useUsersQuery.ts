/**
 * Admin Users Query
 *
 * Fetches all users for admin management operations.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { adminUserService } from '../services/AdminUserService';

import type { AdminUser } from '@odysseus/shared-schemas';
import type { UseQueryOptions } from '@tanstack/react-query';

export function useUsersQuery(options?: {
  queryOptions?: Omit<UseQueryOptions<AdminUser[]>, 'queryKey' | 'queryFn'>;
}) {
  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: async (): Promise<AdminUser[]> => {
      const result = await adminUserService.getUsers();
      return result.users;
    },
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options?.queryOptions,
  });
}
