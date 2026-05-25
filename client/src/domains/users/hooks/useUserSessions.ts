/**
 * User Sessions Hooks
 *
 * React Query hooks for session management operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { UserSessionService } from '../services/UserSessionService';

function useUserSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.users.sessions(),
    queryFn: () => UserSessionService.getMySessions(),
    staleTime: 60 * 1000,
  });
}

function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => UserSessionService.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions() });
    },
  });
}

/** Returns number of sessions revoked. */
function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => UserSessionService.revokeAllOtherSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions() });
    },
  });
}

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
    revokeSessionAsync: revokeSessionMutation.mutateAsync,
    isRevoking: revokeSessionMutation.isPending,
    revokeAll: revokeAllMutation.mutate,
    isRevokingAll: revokeAllMutation.isPending,
  };
}
