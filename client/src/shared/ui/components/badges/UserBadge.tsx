import { UsersRound } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { getUserBadgeStyles } from './userBadge.styles';

export type UserBadgeType = 'unassigned' | 'currentUser' | 'otherUser';

interface UserBadgeProps {
  type: UserBadgeType;
  initials?: string;
  username?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'navigator';
}

export function UserBadge({
  type,
  initials,
  username,
  size = 'sm',
  variant = 'default',
}: UserBadgeProps) {
  const sizeClasses = {
    sm: {
      badge: 'w-5 h-5',
      icon: 11,
      text: 'text-[9px]',
    },
    md: {
      badge: 'w-6 h-6',
      icon: 14,
      text: 'text-xs',
    },
  };

  const { badge: badgeSize, icon: iconSize, text: textSize } = sizeClasses[size];
  const ownershipStyles = getUserBadgeStyles(type);

  // Navigator variant doesn't use ownership colors - inherits from parent for selected/hover states
  const colorClass =
    variant === 'navigator'
      ? 'text-inherit'
      : `${ownershipStyles.background} ${ownershipStyles.text}`;

  // Navigator variant: inline text/icon without circular container
  if (variant === 'navigator') {
    if (type === 'unassigned') {
      return (
        <Tooltip content="Unassigned/Common" side="bottom">
          <span className={`${colorClass} flex-shrink-0`}>
            <UsersRound size={iconSize} />
          </span>
        </Tooltip>
      );
    }

    const title =
      type === 'currentUser'
        ? 'Assigned to you'
        : username
          ? `Assigned to ${username}`
          : 'Assigned to another user';

    return (
      <Tooltip content={title} side="bottom">
        <span className={`${colorClass} ${textSize} font-semibold flex-shrink-0`}>{initials}</span>
      </Tooltip>
    );
  }

  // Default variant: circular badge with background
  if (type === 'unassigned') {
    return (
      <Tooltip content="Unassigned/Common" side="bottom">
        <div
          className={`${badgeSize} rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}
        >
          <UsersRound size={iconSize} />
        </div>
      </Tooltip>
    );
  }

  const title =
    type === 'currentUser'
      ? 'Assigned to you'
      : username
        ? `Assigned to ${username}`
        : 'Assigned to another user';

  return (
    <Tooltip content={title} side="bottom">
      <div
        className={`${badgeSize} ${colorClass} rounded-full flex items-center justify-center ${textSize} font-bold flex-shrink-0`}
      >
        {initials}
      </div>
    </Tooltip>
  );
}
