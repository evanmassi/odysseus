/**
 * Storage Ownership
 *
 * Ownership calculations and cascade logic for storage resources.
 */
import { useMemo } from 'react';

import { getPersonInitials } from '@odysseus/shared-schemas';

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
  getEffectiveOwner: (
    resource: BoxConfiguration,
    parentRack: RackConfiguration
  ) => string | undefined;
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

  const getEffectiveOwner = useMemo(
    () =>
      (resource: BoxConfiguration, parentRack: RackConfiguration): string | undefined => {
        // null = explicitly unassigned/common (no owner)
        if (resource.assignedUserId === null) return undefined;
        // undefined = inherit from rack
        return resource.assignedUserId ?? parentRack.assignedUserId;
      },
    []
  );

  const isOwnedByCurrentUser = useMemo(
    () =>
      (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
        if (!currentUserId) return false;

        // null = explicitly unassigned/common (not owned by anyone)
        if (resource.assignedUserId === null) return false;

        if (resource.assignedUserId === currentUserId) return true;

        // Cascade: box inherits rack owner if unassigned (undefined, not null)
        if (
          parentRack &&
          resource.assignedUserId === undefined &&
          parentRack.assignedUserId === currentUserId
        ) {
          return true;
        }

        return false;
      },
    [currentUserId]
  );

  return {
    getUserInfo,
    getEffectiveOwner,
    isOwnedByCurrentUser,
  };
}
