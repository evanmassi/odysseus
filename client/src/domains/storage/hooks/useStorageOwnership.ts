/**
 * Storage Ownership
 *
 * Ownership calculations and cascade logic for storage resources.
 */
import { useMemo } from 'react';

import { getPersonInitials } from '@odysseus/shared-schemas';

import { getEffectiveOwnerId } from '../utils/effectiveOwner';

import type {
  BoxConfiguration,
  RackConfiguration,
  UserDisplayInfo,
} from '@odysseus/shared-schemas';

export interface UserInfo {
  initials: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface UseStorageOwnershipResult {
  getUserInfo: (userId: string) => UserInfo | null;
  isOwnedByCurrentUser: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
}

export function useStorageOwnership(
  users: UserDisplayInfo[],
  currentUserId: string | undefined
): UseStorageOwnershipResult {
  const getUserInfo = useMemo(
    () =>
      (userId: string): UserInfo | null => {
        const user = users.find(u => u.id === userId);
        if (!user) return null;

        return {
          initials: getPersonInitials({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
          }),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    [users]
  );

  const isOwnedByCurrentUser = useMemo(
    () =>
      (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
        if (!currentUserId) return false;
        return (
          getEffectiveOwnerId(resource.assignedUserId, parentRack?.assignedUserId) === currentUserId
        );
      },
    [currentUserId]
  );

  return {
    getUserInfo,
    isOwnedByCurrentUser,
  };
}
