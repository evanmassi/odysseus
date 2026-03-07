import { UserBadge, type UserBadgeType } from '@shared/ui/components';

import { useStorageManagerContext } from '../StorageManagerContext';

interface AssignmentBadgeProps {
  userId: string | undefined;
  size: 'sm' | 'md';
  isOwnedByCurrentUser: boolean;
}

export function AssignmentBadge({ userId, size, isOwnedByCurrentUser }: AssignmentBadgeProps) {
  const { getUserInfo } = useStorageManagerContext();

  const userInfo = userId ? getUserInfo(userId) : null;

  const type: UserBadgeType = !userInfo
    ? 'unassigned'
    : isOwnedByCurrentUser
      ? 'currentUser'
      : 'otherUser';

  return (
    <UserBadge
      type={type}
      initials={userInfo?.initials}
      username={userInfo?.username}
      size={size}
      variant="default"
    />
  );
}
