import { useMemo } from 'react';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';

interface UseResourcePermissionsResult {
  canEditResource: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
}

/**
 * Hook for resource permission checks
 * Encapsulates permission logic: admins can do anything, owners can edit their resources
 * Accepts any user object with id and role properties (duck typing)
 */
export function useResourcePermissions(
  currentUser: { id: string; role?: string } | null | undefined
): UseResourcePermissionsResult {
  const canEditResource = useMemo(
    () =>
      (
        resource: RackConfiguration | BoxConfiguration,
        parentRack?: RackConfiguration
      ): boolean => {
        if (!currentUser) return false;

        // Admins can edit anything
        if (currentUser.role === 'admin') return true;

        // Resource owner can edit
        if (resource.assignedUserId === currentUser.id) return true;

        // Cascade: rack owner can edit unassigned boxes
        if (
          parentRack &&
          !resource.assignedUserId &&
          parentRack.assignedUserId === currentUser.id
        ) {
          return true;
        }

        return false;
      },
    [currentUser]
  );

  return {
    canEditResource,
  };
}
