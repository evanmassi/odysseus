/**
 * Admin Audit Retention Query
 *
 * Loads retention metrics + policy together for the retention settings panel.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { auditService } from '../services/AuditService';

export function useAuditRetentionQuery() {
  return useQuery({
    queryKey: queryKeys.admin.auditRetention(),
    queryFn: async () => {
      const [metrics, policy] = await Promise.all([
        auditService.getRetentionMetrics(),
        auditService.getRetentionPolicy(),
      ]);
      return { metrics, policy };
    },
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
  });
}
