/**
 * User Ownership Badge
 *
 * Square initial chip showing tube ownership state with color-coded background.
 */

import { UsersRound } from 'lucide-react';

import { Badge, Tooltip } from '@shared/ui';

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
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'navigator';
}

// Icon size scales with badge size so the unassigned glyph fits visually.
const iconSizeMap: Record<NonNullable<UserBadgeProps['size']>, number> = {
  xs: 11,
  sm: 11,
  md: 14,
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
  const ownershipStyles = getUserBadgeStyles(type);
  const iconSize = iconSizeMap[size];

  // Navigator variant: inline text/icon only (inherits colors from parent state).
  if (variant === 'navigator') {
    if (type === 'unassigned') {
      return (
        <Tooltip content="Unassigned/Common" side="bottom">
          <span className="text-inherit flex-shrink-0">
            <UsersRound size={iconSize} />
          </span>
        </Tooltip>
      );
    }

    return (
      <Tooltip content={getAssignmentTitle(type, username)} side="bottom">
        <span className="text-inherit font-semibold flex-shrink-0">{initials}</span>
      </Tooltip>
    );
  }

  const colorClass = `${ownershipStyles.background} ${ownershipStyles.text}`;

  if (type === 'unassigned') {
    return (
      <Tooltip content="Unassigned/Common" side="bottom">
        <Badge size={size} className={colorClass}>
          <UsersRound size={iconSize} />
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={getAssignmentTitle(type, username)} side="bottom">
      <Badge size={size} className={colorClass}>
        {initials}
      </Badge>
    </Tooltip>
  );
}
