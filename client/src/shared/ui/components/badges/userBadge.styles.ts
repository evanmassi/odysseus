/**
 * User Badge Styles
 *
 * Provides Tailwind class strings for user badge visual styling (borders, backgrounds).
 */

import type { UserBadgeType } from './UserBadge';

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
