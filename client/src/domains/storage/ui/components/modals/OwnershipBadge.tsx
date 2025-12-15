import { OwnershipIndicatorBadge, type OwnershipType } from '@shared/ui/components';

import { useStorageManagementContext } from './StorageManagementContext';

interface OwnershipBadgeProps {
  userId: string | undefined;
  size: 'sm' | 'md';
  isOwnedByCurrentUser: boolean;
}

/**
 * Ownership badge for storage management modal
 * Thin wrapper around shared OwnershipIndicatorBadge that uses context for user lookup
 */
export function OwnershipBadge({ userId, size, isOwnedByCurrentUser }: OwnershipBadgeProps) {
  const { getUserInfo } = useStorageManagementContext();

  const userInfo = userId ? getUserInfo(userId) : null;

  const type: OwnershipType = !userInfo
    ? 'unassigned'
    : isOwnedByCurrentUser
      ? 'currentUser'
      : 'otherUser';

  return (
    <OwnershipIndicatorBadge
      type={type}
      initials={userInfo?.initials}
      username={userInfo?.username}
      size={size}
      variant="default"
    />
  );
}
