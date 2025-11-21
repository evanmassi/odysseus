/**
 * React Query hook for fetching all users (admin only)
 * Reuses AdminService.getUsers() with proper caching and error handling
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';

import { AdminService } from '../services/AdminService';

import type { AdminUser } from '@odysseus/shared-schemas';
import type { UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook to fetch all users for admin operations
 * Use this for assignment dropdowns, user management tables, etc.
 *
 * @example
 * ```tsx
 * const { data: users = [], isLoading } = useUsersQuery();
 * const activeUsers = users.filter(u => u.isActive);
 * ```
 */
export function useUsersQuery(options?: {
  queryOptions?: Omit<UseQueryOptions<AdminUser[]>, 'queryKey' | 'queryFn'>;
}) {
  const adminService = new AdminService();

  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: async (): Promise<AdminUser[]> => {
      const result = await adminService.getUsers();
      return result.users;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - users don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options?.queryOptions,
  });
}
