/**
 * Storage Permissions
 *
 * Permission checks and access control for storage resources.
 */
import { useMemo } from 'react';

import type { BoxConfiguration, RackConfiguration, TankConfiguration } from '@domains/storage';

interface UseStoragePermissionsResult {
  canEditResource: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
  canManageStorage: boolean;
  isResourceLocked: (resource: TankConfiguration | RackConfiguration | BoxConfiguration) => boolean;
}

export function useStoragePermissions(
  currentUser: { id: string; role?: string } | null | undefined,
  isDemo = false
): UseStoragePermissionsResult {
  const isResourceLocked = useMemo(
    () =>
      (resource: TankConfiguration | RackConfiguration | BoxConfiguration): boolean =>
        isDemo && resource.isSeeded === true,
    [isDemo]
  );

  const canEditResource = useMemo(
    () =>
      (resource: RackConfiguration | BoxConfiguration, parentRack?: RackConfiguration): boolean => {
        if (!currentUser) return false;

        if (isDemo && resource.isSeeded) return false;

        if (currentUser.role === 'lab_admin' || currentUser.role === 'system_admin') return true;

        // null = explicitly unassigned/common - anyone can edit
        if (resource.assignedUserId === null) return true;

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
    [currentUser, isDemo]
  );

  const canManageStorage = useMemo(
    () => currentUser?.role === 'lab_admin' || currentUser?.role === 'system_admin',
    [currentUser?.role]
  );

  return {
    canEditResource,
    canManageStorage,
    isResourceLocked,
  };
}
