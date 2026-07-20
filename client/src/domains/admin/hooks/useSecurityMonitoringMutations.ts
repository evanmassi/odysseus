/**
 * Security Monitoring Mutations
 *
 * React Query mutations for security monitoring actions.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { securityMonitoringService } from '../services/SecurityMonitoringService';

export function usePurgeExpiredSessionsMutation() {
  return useMutation({
    mutationFn: () => securityMonitoringService.purgeExpiredSessions(),
    meta: { invalidates: [queryKeys.security.all] },
  });
}

export function useRevokeSessionMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => securityMonitoringService.revokeSession(sessionId),
    meta: { invalidates: [queryKeys.security.all] },
  });
}

export function useBulkRevokeSessionsMutation() {
  return useMutation({
    mutationFn: (sessionIds: string[]) => securityMonitoringService.bulkRevokeSessions(sessionIds),
    meta: { invalidates: [queryKeys.security.all] },
  });
}
