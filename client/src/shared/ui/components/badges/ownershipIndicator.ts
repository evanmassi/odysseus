/**
 * Ownership Indicator
 *
 * Provides Tailwind class strings for ownership-based visual styling (borders, backgrounds).
 */

import type { OwnershipType } from './OwnershipIndicatorBadge';

export interface OwnershipIndicatorStyles {
  border: string;
  background: string;
  text: string;
}

const styleMap: Record<OwnershipType, OwnershipIndicatorStyles> = {
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

export function getOwnershipIndicatorStyles(type: OwnershipType): OwnershipIndicatorStyles {
  return styleMap[type];
}
