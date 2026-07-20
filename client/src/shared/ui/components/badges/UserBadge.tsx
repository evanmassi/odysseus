/**
 * User Ownership Badge
 *
 * Square initial chip showing ownership/assignment state with a color-coded background.
 */

import type { ComponentProps } from 'react';

import { UsersRound } from 'lucide-react';

import { Badge, Tooltip } from '@shared/ui';

export type UserBadgeType = 'unassigned' | 'currentUser' | 'otherUser';

interface UserBadgeStyles {
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

interface UserBadgeProps {
  type: UserBadgeType;
  initials?: string;
  username?: string;
  size?: ComponentProps<typeof Badge>['size'];
  /** Suppress the ownership tooltip — e.g. when the badge is reused as a menu trigger. */
  showTooltip?: boolean;
}

// Icon size scales with badge size so the unassigned glyph fits visually.
const iconSizeMap: Record<NonNullable<UserBadgeProps['size']>, number> = {
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
  showTooltip = true,
}: UserBadgeProps) {
  const ownershipStyles = styleMap[type];
  const iconSize = iconSizeMap[size];

  const colorClass = `${ownershipStyles.background} ${ownershipStyles.text}`;

  const tooltipContent =
    type === 'unassigned' ? 'Unassigned/Common' : getAssignmentTitle(type, username);

  return (
    <Tooltip content={tooltipContent} side="bottom" disabled={!showTooltip}>
      <Badge size={size} lit={ownershipStyles.lit} className={colorClass}>
        {type === 'unassigned' ? (
          <UsersRound size={iconSize} className="text-foreground" />
        ) : (
          <span className="text-foreground">{initials}</span>
        )}
      </Badge>
    </Tooltip>
  );
}
