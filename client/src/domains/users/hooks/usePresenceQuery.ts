import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

/**
 * Hook to subscribe to online user presence
 *
 * Presence is populated entirely by socket events (user_online/user_offline).
 * The queryBridge updates this cache via setQueryData when events arrive.
 *
 * Why no REST fetch:
 * - Socket `user_online` event includes full list of all online users
 * - REST fetch creates race condition (fetch can overwrite socket event data)
 * - Socket is the authoritative real-time source for presence
 *
 * @returns React Query result with online user IDs
 *
 * @example
 * ```tsx
 * const { data: onlineUserIds = [] } = usePresenceQuery();
 * ```
 */
export function usePresenceQuery() {
  return useQuery({
    queryKey: queryKeys.users.presence(),
    // No actual fetch - socket events populate this via setQueryData
    // queryFn returns current cache or empty array
    queryFn: (): Promise<string[]> => Promise.resolve([]),
    initialData: [], // Start with empty array
    staleTime: Infinity, // Never refetch - socket events handle updates
    gcTime: Infinity, // Keep in cache for app lifetime
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Don't fetch on mount - wait for socket events
  });
}

/**
 * Hook to check if a specific user is online
 *
 * Derives from usePresenceQuery cache - no additional network requests.
 *
 * @param userId - User ID to check
 * @returns true if user is online, false otherwise
 *
 * @example
 * ```tsx
 * const isOnline = useIsUserOnline(userId);
 * ```
 */
export function useIsUserOnline(userId: string): boolean {
  const { data: onlineUserIds = [] } = usePresenceQuery();
  return onlineUserIds.includes(userId);
}

/**
 * Hook to get online user IDs excluding current user
 *
 * Useful for displaying "other online users" in the UI.
 *
 * @param currentUserId - Current user's ID to exclude
 * @returns Array of online user IDs excluding current user
 *
 * @example
 * ```tsx
 * const otherOnlineUsers = useOtherOnlineUsers(currentUser.id);
 * ```
 */
export function useOtherOnlineUsers(currentUserId: string | undefined): string[] {
  const { data: onlineUserIds = [] } = usePresenceQuery();

  if (!currentUserId) return onlineUserIds;
  return onlineUserIds.filter(id => id !== currentUserId);
}
