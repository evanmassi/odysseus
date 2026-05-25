/**
 * User Ownership Badge
 *
 * Square initial chip showing tube ownership state with color-coded background.
 */

import { UsersRound } from 'lucide-react';

import { Badge, Tooltip } from '@shared/ui';

export type UserBadgeType = 'unassigned' | 'currentUser' | 'otherUser';

export interface UserBadgeStyles {
  background: string;
  text: string;
  lit: boolean;
}

const styleMap: Record<UserBadgeType, UserBadgeStyles> = {
  currentUser: {
    background: 'bg-ownership-user-badge/20',
    text: 'text-ownership-user-badge',
    lit: true,
  },
  otherUser: {
    background: 'bg-ownership-other-badge/20',
    text: 'text-ownership-other-badge',
    lit: false,
  },
  unassigned: {
    background: 'bg-ownership-unassigned-badge/20',
    text: 'text-ownership-unassigned-badge',
    lit: false,
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
        <Badge size={size} lit={ownershipStyles.lit} className={colorClass}>
          <UsersRound size={iconSize} className="text-foreground" />
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={getAssignmentTitle(type, username)} side="bottom">
      <Badge size={size} lit={ownershipStyles.lit} className={colorClass}>
        <span className="text-foreground">{initials}</span>
      </Badge>
    </Tooltip>
  );
}
