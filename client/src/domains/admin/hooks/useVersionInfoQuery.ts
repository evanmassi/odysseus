/**
 * Admin Version Info Query
 *
 * Loads the deployed app version + environment for the system tab footer.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { adminService } from '../services/AdminService';

export function useVersionInfoQuery() {
  return useQuery({
    queryKey: queryKeys.admin.versionInfo(),
    queryFn: () => adminService.getVersionInfo(),
    staleTime: CACHE_TIMES.CONFIG.staleTime,
    gcTime: CACHE_TIMES.CONFIG.gcTime,
  });
}
