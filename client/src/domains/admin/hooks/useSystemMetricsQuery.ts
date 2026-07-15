/**
 * Admin System Metrics Query
 *
 * Loads lab-wide counts (tubes, users, researchers) for the system tab stat strip.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminService } from '../services/AdminService';

export function useSystemMetricsQuery(options?: { enabled?: boolean }) {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.admin.metrics(labId),
    queryFn: () => adminService.getMetrics(),
    enabled: options?.enabled ?? true,
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
  });
}
