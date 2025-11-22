import { useMemo } from 'react';

import type { AdminUser } from '@odysseus/shared-schemas';
import type { BoxConfiguration, RackConfiguration } from '@domains/storage';

interface UseResourceOwnershipResult {
  getUserInitials: (userId: string) => string;
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
  const getUserInitials = useMemo(
    () => (userId: string): string => {
      const user = users.find(u => u.id === userId);
      if (!user) return '?';

      const first = user.username.charAt(0);
      const last = user.username.charAt(1) || '';
      return (first + last).toUpperCase();
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
      (
        resource: RackConfiguration | BoxConfiguration,
        parentRack?: RackConfiguration
      ): boolean => {
        if (!currentUserId) return false;

        if (resource.assignedUserId === currentUserId) return true;

        // Cascade: box inherits rack owner if unassigned
        if (
          parentRack &&
          !resource.assignedUserId &&
          parentRack.assignedUserId === currentUserId
        ) {
          return true;
        }

        return false;
      },
    [currentUserId]
  );

  return {
    getUserInitials,
    getEffectiveOwner,
    isOwnedByCurrentUser,
  };
}
