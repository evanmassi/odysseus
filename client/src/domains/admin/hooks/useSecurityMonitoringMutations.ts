/**
 * Security Monitoring Mutations
 *
 * React Query mutations for security monitoring actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { securityMonitoringService } from '../services/SecurityMonitoringService';

export function usePurgeExpiredSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => securityMonitoringService.purgeExpiredSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => securityMonitoringService.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
  });
}

export function useBulkRevokeSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionIds: string[]) => securityMonitoringService.bulkRevokeSessions(sessionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
  });
}
