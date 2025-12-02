import { useMemo } from 'react';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';

interface UseResourcePermissionsResult {
  canEditResource: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
  canManageStorage: boolean;
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
      (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
        if (!currentUser) return false;

        // Admins can edit anything
        if (currentUser.role === 'admin') return true;

        // null = explicitly unassigned/common - anyone can edit
        if (resource.assignedUserId === null) return true;

        // Resource owner can edit
        if (resource.assignedUserId === currentUser.id) return true;

        // Cascade: rack owner can edit unassigned boxes (undefined, not null)
        if (
          parentRack &&
          resource.assignedUserId === undefined &&
          parentRack.assignedUserId === currentUser.id
        ) {
          return true;
        }

        return false;
      },
    [currentUser]
  );

  // Only admins can manage storage structure (add/edit/delete tanks, racks, boxes)
  const canManageStorage = useMemo(() => currentUser?.role === 'admin', [currentUser?.role]);

  return {
    canEditResource,
    canManageStorage,
  };
}
