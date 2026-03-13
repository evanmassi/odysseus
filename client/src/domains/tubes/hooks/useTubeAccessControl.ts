/**
 * Tube Access Control Hook
 *
 * Client-side permission checks for tube locking operations.
 * Mirrors server-side AccessControlService logic for UI feedback.
 */

import { useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';

import type { TubeData } from '@odysseus/shared-schemas';

interface ContainerInfo {
  assignedUserId?: string | null;
  sharedWithUserIds?: string[];
}

interface UseTubeAccessControlResult {
  canLockTube: (tube: TubeData, container?: ContainerInfo) => boolean;
  canUnlockTube: (tube: TubeData) => boolean;
  canAccessLockedTube: (tube: TubeData) => boolean;
  canShareTubeAccess: (tube: TubeData) => boolean;
  isLockedOutFrom: (tube: TubeData) => boolean;
  isLockedByCurrentUser: (tube: TubeData) => boolean;
  hasExplicitSharedAccess: (tube: TubeData) => boolean;
}

/**
 * @example
 * ```tsx
 * const { canLockTube, isLockedOutFrom } = useTubeAccessControl(currentUser);
 *
 * if (canLockTube(tube, containerInfo)) {
 *   // Show lock button
 * }
 *
 * if (isLockedOutFrom(tube)) {
 *   // Show lock indicator, dim tube
 * }
 * ```
 */
export function useTubeAccessControl(
  currentUser: { id: string; role?: string } | null | undefined
): UseTubeAccessControlResult {
  const isAdmin = useMemo(() => isAdminRole(currentUser?.role), [currentUser?.role]);
  const userId = currentUser?.id;

  const canLockTube = useCallback(
    (tube: TubeData, container?: ContainerInfo): boolean => {
      if (!userId) return false;
      if (isAdmin) return !tube.isLocked;
      if (tube.isLocked) return false;

      // In user's own assigned space
      if (container?.assignedUserId === userId) return true;

      // In common/unassigned space (null or undefined)
      if (!container?.assignedUserId) return true;

      // In another user's space - cannot lock
      return false;
    },
    [userId, isAdmin]
  );

  const canUnlockTube = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      if (!tube.isLocked) return false;
      if (isAdmin) return true;
      return tube.lockedBy === userId;
    },
    [userId, isAdmin]
  );

  const canAccessLockedTube = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      if (!tube.isLocked) return true;
      if (isAdmin) return true;
      if (tube.lockedBy === userId) return true;
      if (tube.sharedWithUserIds?.includes(userId)) return true;
      return false;
    },
    [userId, isAdmin]
  );

  const canShareTubeAccess = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      if (!tube.isLocked) return false;
      if (isAdmin) return true;
      return tube.lockedBy === userId;
    },
    [userId, isAdmin]
  );

  const isLockedOutFrom = useCallback(
    (tube: TubeData): boolean => {
      if (!tube.isLocked) return false;
      if (!userId) return true;
      if (isAdmin) return false;
      if (tube.lockedBy === userId) return false;
      if (tube.sharedWithUserIds?.includes(userId)) return false;
      return true;
    },
    [userId, isAdmin]
  );

  const isLockedByCurrentUser = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      return tube.isLocked === true && tube.lockedBy === userId;
    },
    [userId]
  );

  const hasExplicitSharedAccess = useCallback(
    (tube: TubeData): boolean => {
      if (!userId || !tube.isLocked) return false;
      return tube.sharedWithUserIds?.includes(userId) ?? false;
    },
    [userId]
  );

  return {
    canLockTube,
    canUnlockTube,
    canAccessLockedTube,
    canShareTubeAccess,
    isLockedOutFrom,
    isLockedByCurrentUser,
    hasExplicitSharedAccess,
  };
}
