/**
 * Security Monitoring Mutations
 *
 * React Query mutations for security monitoring actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { logger } from '@infra/logger';

import { securityMonitoringService } from '../services/SecurityMonitoringService';

export function usePurgeExpiredSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => securityMonitoringService.purgeExpiredSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
    onError: error => {
      logger.error('Failed to purge expired sessions', { error });
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
    onError: error => {
      logger.error('Failed to revoke session', { error });
    },
  });
}
