/**
 * Admin Audit Log Query
 *
 * Paginated, filtered audit-log search. `labId` selects a specific lab's log (system-admin view);
 * without it the current context's log is searched. Filters/pagination live in the query key, so
 * changing them refetches automatically.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { auditService } from '../services/AuditService';
import { labService } from '../services/LabService';

import type { AuditLogFilters } from '@odysseus/shared-schemas';

export function useAuditLogQuery(
  labId: string | undefined,
  filters: AuditLogFilters,
  includeArchive: boolean
) {
  return useQuery({
    queryKey: queryKeys.admin.auditLog(labId ?? '', filters, includeArchive),
    queryFn: () =>
      labId
        ? labService.getLabAuditLog(labId, filters, includeArchive)
        : auditService.searchAuditLogs(filters, includeArchive),
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
  });
}
