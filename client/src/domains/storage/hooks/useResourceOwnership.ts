import { useMemo } from 'react';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';
import type { AdminUser } from '@odysseus/shared-schemas';

interface UserInfo {
  initials: string;
  username: string;
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
  users: AdminUser[],
  currentUserId: string | undefined
): UseResourceOwnershipResult {
  const getUserInfo = useMemo(
    () =>
      (userId: string): UserInfo | null => {
        const user = users.find(u => u.id === userId);
        if (!user) return null;

        const first = user.username.charAt(0);
        const last = user.username.charAt(1) || '';
        const initials = (first + last).toUpperCase();

        return { initials, username: user.username };
      },
    [users]
  );

  const getEffectiveOwner = useMemo(
    () =>
      (resource: BoxConfiguration, parentRack: RackConfiguration): string | undefined => {
        return resource.assignedUserId ?? parentRack.assignedUserId;
      },
    []
  );

  const isOwnedByCurrentUser = useMemo(
    () =>
      (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
        if (!currentUserId) return false;

        if (resource.assignedUserId === currentUserId) return true;

        // Cascade: box inherits rack owner if unassigned
        if (parentRack && !resource.assignedUserId && parentRack.assignedUserId === currentUserId) {
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
