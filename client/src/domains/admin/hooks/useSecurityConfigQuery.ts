/**
 * Admin Security Config Query
 *
 * Loads the global security configuration. Manual (`enabled: false`) — callers trigger it via
 * `refetch` when their surface opens, so it doesn't fetch while the settings modal is closed.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { adminService } from '../services/AdminService';

export function useSecurityConfigQuery() {
  return useQuery({
    queryKey: queryKeys.admin.securityConfig(),
    queryFn: () => adminService.getSecurityConfig(),
    enabled: false,
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
  });
}
