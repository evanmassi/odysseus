import { useMemo } from 'react';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';
import type { UserDisplayInfo } from '@odysseus/shared-schemas';

interface UserInfo {
  initials: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface UseResourceOwnershipResult {
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

/**
 * Hook for resource ownership calculations and display
 * Handles user initials, ownership cascade, and ownership checks
 */
export function useResourceOwnership(
  users: UserDisplayInfo[],
  currentUserId: string | undefined
): UseResourceOwnershipResult {
  const getUserInfo = useMemo(
    () =>
      (userId: string): UserInfo | null => {
        const user = users.find(u => u.id === userId);
        if (!user) return null;

        let initials: string;
        if (user.firstName && user.lastName) {
          // Use actual name initials from Person
          initials = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
        } else {
          // Fallback to username-based initials
          const first = user.username.charAt(0);
          const last = user.username.charAt(1) || '';
          initials = (first + last).toUpperCase();
        }

        return {
          initials,
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
