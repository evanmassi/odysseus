import { useMemo } from 'react';

import { useAuthStore } from '@domains/authentication';
import { useActiveUsersQuery, useUserPresenceQuery } from '@domains/users';

import { UserPresenceBadge } from './UserPresenceBadge';

/**
 * Online Users Badges
 *
 * Displays badges for all currently online users (excluding current user).
 * Badges show user initials with a green background.
 * Gracefully handles loading/error states by not rendering anything.
 */
export function OnlineUsersBadges() {
  const { user: currentUser } = useAuthStore();
  const { data: onlineUserIds = [] } = useUserPresenceQuery();
  const { data: allUsers = [] } = useActiveUsersQuery();

  // Filter to online users excluding current user, with user details
  const onlineUsers = useMemo(() => {
    if (!currentUser?.id) return [];

    return onlineUserIds
      .filter(id => id !== currentUser.id)
      .map(id => allUsers.find(u => u.id === id))
      .filter((user): user is NonNullable<typeof user> => user !== undefined);
  }, [onlineUserIds, allUsers, currentUser?.id]);

  // Don't render anything if no other users are online
  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {/* Stacked badges with negative margin for overlap effect */}
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 5).map(user => (
          <UserPresenceBadge
            key={user.id}
            username={user.username}
            firstName={user.firstName}
            lastName={user.lastName}
          />
        ))}
      </div>

      {/* Overflow indicator if more than 5 users online */}
      {onlineUsers.length > 5 && (
        <span className="ml-1 text-xs text-muted-foreground font-medium">
          +{onlineUsers.length - 5}
        </span>
      )}
    </div>
  );
}
