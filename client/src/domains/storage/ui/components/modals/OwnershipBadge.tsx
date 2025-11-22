import React, { useMemo } from 'react';

import type { AdminUser } from '@odysseus/shared-schemas';
import { UsersRound } from 'lucide-react';

interface OwnershipBadgeProps {
  userId: string | undefined;
  users: AdminUser[];
  size: 'sm' | 'md';
  isOwnedByCurrentUser: boolean;
}

export function OwnershipBadge({
  userId,
  users,
  size,
  isOwnedByCurrentUser,
}: OwnershipBadgeProps) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'sm' ? 12 : 14;

  const userInfo = useMemo(() => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const first = user.username.charAt(0);
    const last = user.username.charAt(1) || '';
    const initials = (first + last).toUpperCase();

    return { username: user.username, initials };
  }, [userId, users]);

  if (!userInfo) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0`}
        title="Unassigned"
      >
        <UsersRound size={iconSize} className="text-yellow-800" />
      </div>
    );
  }

  const bgColor = isOwnedByCurrentUser ? 'bg-blue-500' : 'bg-gray-400';

  return (
    <div
      className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
      title={`Owned by ${userInfo.username}`}
    >
      {userInfo.initials}
    </div>
  );
}
