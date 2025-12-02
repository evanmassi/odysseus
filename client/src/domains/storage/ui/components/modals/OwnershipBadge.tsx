import React from 'react';

import { UsersRound } from 'lucide-react';

import { useStorageManagementContext } from './StorageManagementContext';

interface OwnershipBadgeProps {
  userId: string | undefined;
  size: 'sm' | 'md';
  isOwnedByCurrentUser: boolean;
}

export function OwnershipBadge({ userId, size, isOwnedByCurrentUser }: OwnershipBadgeProps) {
  const { getUserInfo } = useStorageManagementContext();

  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'sm' ? 12 : 14;

  const userInfo = userId ? getUserInfo(userId) : null;

  if (!userInfo) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-warning-bg flex items-center justify-center flex-shrink-0`}
        title="Unassigned/Common"
      >
        <UsersRound size={iconSize} className="text-warning-btnText" />
      </div>
    );
  }

  const bgColor = isOwnedByCurrentUser ? 'bg-ice-600' : 'bg-slate-400';

  return (
    <div
      className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
      title={`Owned by ${userInfo.username}`}
    >
      {userInfo.initials}
    </div>
  );
}
