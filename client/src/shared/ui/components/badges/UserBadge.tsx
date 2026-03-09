/**
 * User Ownership Badge
 *
 * Circular avatar showing tube ownership state with color-coded initials.
 */

import { UsersRound } from 'lucide-react';

import { Tooltip } from '@shared/ui';

export type UserBadgeType = 'unassigned' | 'currentUser' | 'otherUser';

export interface UserBadgeStyles {
  border: string;
  background: string;
  text: string;
}

const styleMap: Record<UserBadgeType, UserBadgeStyles> = {
  currentUser: {
    border: 'border-l-ownership-user-badge',
    background: 'bg-ownership-user-badge',
    text: 'text-white',
  },
  otherUser: {
    border: 'border-l-ownership-other-badge',
    background: 'bg-ownership-other-badge',
    text: 'text-white',
  },
  unassigned: {
    border: 'border-l-ownership-unassigned-badge',
    background: 'bg-ownership-unassigned-badge',
    text: 'text-white',
  },
};

export function getUserBadgeStyles(type: UserBadgeType): UserBadgeStyles {
  return styleMap[type];
}

interface UserBadgeProps {
  type: UserBadgeType;
  initials?: string;
  username?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'navigator';
}

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

function getAssignmentTitle(type: UserBadgeType, username?: string): string {
  if (type === 'currentUser') return 'Assigned to you';
  return username ? `Assigned to ${username}` : 'Assigned to another user';
}

export function UserBadge({
  type,
  initials,
  username,
  size = 'sm',
  variant = 'default',
}: UserBadgeProps) {
  const { badge: badgeSize, icon: iconSize, text: textSize } = sizeClasses[size];
  const ownershipStyles = getUserBadgeStyles(type);

  // Navigator variant inherits colors from parent for selected/hover states
  const colorClass =
    variant === 'navigator'
      ? 'text-inherit'
      : `${ownershipStyles.background} ${ownershipStyles.text}`;

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

    return (
      <Tooltip content={getAssignmentTitle(type, username)} side="bottom">
        <span className={`${colorClass} ${textSize} font-semibold flex-shrink-0`}>{initials}</span>
      </Tooltip>
    );
  }

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

  return (
    <Tooltip content={getAssignmentTitle(type, username)} side="bottom">
      <div
        className={`${badgeSize} ${colorClass} rounded-full flex items-center justify-center ${textSize} font-bold flex-shrink-0`}
      >
        {initials}
      </div>
    </Tooltip>
  );
}
