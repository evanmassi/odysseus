/**
 * User Sessions Hooks
 *
 * React Query hooks for session management operations.
 */
import { useQuery, useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { MS_PER_MINUTE } from '@shared/utils';

import { UserSessionService } from '../services/UserSessionService';

function useUserSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.users.sessions(),
    queryFn: () => UserSessionService.getMySessions(),
    staleTime: MS_PER_MINUTE,
  });
}

function useRevokeSessionMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => UserSessionService.revokeSession(sessionId),
    meta: { invalidates: [queryKeys.users.sessions()] },
  });
}

export function useUserSessions() {
  const sessionsQuery = useUserSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    revokeSession: revokeSessionMutation.mutate,
    revokeSessionAsync: revokeSessionMutation.mutateAsync,
    isRevoking: revokeSessionMutation.isPending,
  };
}
