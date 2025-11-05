/**
 * User Sessions Hooks
 *
 * React Query hooks for session management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserSessionService, type ActiveSession } from '../services/UserSessionService';
import { queryKeys } from '@app/queryKeys';

/**
 * Fetch all active sessions for current user
 */
export function useUserSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.users.sessions(),
    queryFn: () => UserSessionService.getMySessions(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Revoke a specific session mutation
 */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => UserSessionService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions() });
    },
  });
}

/**
 * Revoke all other sessions mutation
 * Returns number of sessions revoked
 */
export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => UserSessionService.revokeAllOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions() });
    },
  });
}

/**
 * Combined hook with all session operations
 */
export function useUserSessions() {
  const sessionsQuery = useUserSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllMutation = useRevokeAllSessionsMutation();

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    refetch: sessionsQuery.refetch,
    revokeSession: revokeSessionMutation.mutate,
    isRevoking: revokeSessionMutation.isPending,
    revokeAll: revokeAllMutation.mutate,
    isRevokingAll: revokeAllMutation.isPending,
  };
}
