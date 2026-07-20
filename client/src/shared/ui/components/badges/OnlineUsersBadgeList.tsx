/**
 * Online Users Badges
 *
 * Displays badges for all currently online users (excluding current user).
 */

import { useMemo } from 'react';

import { useAuthStore } from '@domains/authentication';
import { useActiveUsersQuery, useUserPresenceQuery } from '@domains/users';

import { UserPresenceBadge } from './UserPresenceBadge';

const MAX_VISIBLE_BADGES = 5;

export function OnlineUsersBadgeList() {
  const { user: currentUser } = useAuthStore();
  const { data: onlineUserIds = [] } = useUserPresenceQuery();
  const { data: allUsers = [] } = useActiveUsersQuery();

  const onlineUsers = useMemo(() => {
    if (!currentUser?.id) return [];

    return onlineUserIds
      .filter(id => id !== currentUser.id)
      .map(id => allUsers.find(u => u.id === id))
      .filter((user): user is NonNullable<typeof user> => user !== undefined);
  }, [onlineUserIds, allUsers, currentUser?.id]);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, MAX_VISIBLE_BADGES).map(user => (
          <UserPresenceBadge
            key={user.id}
            username={user.username}
            firstName={user.firstName}
            lastName={user.lastName}
          />
        ))}
      </div>

      {onlineUsers.length > MAX_VISIBLE_BADGES && (
        <span className="ml-1 text-caption text-muted-foreground font-medium">
          +{onlineUsers.length - MAX_VISIBLE_BADGES}
        </span>
      )}
    </div>
  );
}
