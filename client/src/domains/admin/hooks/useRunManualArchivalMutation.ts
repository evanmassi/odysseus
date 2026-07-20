/**
 * Admin Manual Archival Mutation
 *
 * Runs manual audit-log archival. Its error surfaces inline in the retention panel (next to the
 * data), so it opts out of the global error toast via meta.suppressErrorToast.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { auditService } from '../services/AuditService';

export function useRunManualArchivalMutation() {
  return useMutation({
    mutationFn: () => auditService.runManualArchival(),
    meta: {
      invalidates: [queryKeys.admin.auditRetention()],
      suppressErrorToast: true,
    },
  });
}
