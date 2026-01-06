import { UsersRound } from 'lucide-react';

import { Tooltip } from '@shared/ui';

export type OwnershipType = 'unassigned' | 'currentUser' | 'otherUser';

interface OwnershipIndicatorBadgeProps {
  type: OwnershipType;
  initials?: string;
  username?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'navigator';
}

/**
 * Shared ownership indicator badge primitive
 * Displays ownership status as a badge with initials or an icon
 */
export function OwnershipIndicatorBadge({
  type,
  initials,
  username,
  size = 'sm',
  variant = 'default',
}: OwnershipIndicatorBadgeProps) {
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

  // Variant-specific styling
  const variantStyles = {
    default: {
      unassigned: 'bg-ownership-unassigned-badge text-white',
      currentUser: 'bg-ownership-user-badge text-white',
      otherUser: 'bg-ownership-other-badge text-white',
    },
    navigator: {
      // No background, inherit text color from parent button (matches selected/hover states)
      unassigned: 'text-inherit',
      currentUser: 'text-inherit',
      otherUser: 'text-inherit',
    },
  };

  const colorClass = variantStyles[variant][type];

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
