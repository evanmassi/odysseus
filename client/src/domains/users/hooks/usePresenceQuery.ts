/**
 * User Presence Query Hook
 *
 * Subscribes to online user presence populated by socket events.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

/**
 * Why no REST fetch:
 * - Socket `user_online` event includes full list of all online users
 * - REST fetch creates race condition (fetch can overwrite socket event data)
 * - Socket is the authoritative real-time source for presence
 */
export function usePresenceQuery() {
  return useQuery({
    queryKey: queryKeys.users.presence(),
    queryFn: (): Promise<string[]> => Promise.resolve([]),
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
