/**
 * Tube Access Control Hook
 *
 * Client-side permission checks for tube locking operations.
 * Mirrors server-side AccessControlService logic for UI feedback.
 */

import { useMemo, useCallback } from 'react';

import type { TubeData } from '@odysseus/shared-schemas';

interface ContainerInfo {
  assignedUserId?: string | null;
  sharedWithUserIds?: string[];
}

interface UseTubeAccessControlResult {
  /** Check if user can lock a tube */
  canLockTube: (tube: TubeData, container?: ContainerInfo) => boolean;
  /** Check if user can unlock a tube */
  canUnlockTube: (tube: TubeData) => boolean;
  /** Check if user can access (edit) a locked tube */
  canAccessLockedTube: (tube: TubeData) => boolean;
  /** Check if user can share access to a locked tube */
  canShareTubeAccess: (tube: TubeData) => boolean;
  /** Check if tube is locked out from user (shows lock indicator) */
  isLockedOutFrom: (tube: TubeData) => boolean;
  /** Check if tube is locked by the current user */
  isLockedByCurrentUser: (tube: TubeData) => boolean;
}

/**
 * Hook for tube locking permission checks
 *
 * @param currentUser - Current authenticated user
 * @returns Permission check functions
 *
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
  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser?.role]);
  const userId = currentUser?.id;

  /**
   * Check if user can lock a tube
   * - Admins can lock any tube
   * - Users can lock tubes in their own or common space
   * - Cannot lock already-locked tubes
   */
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

  /**
   * Check if user can unlock a tube
   * - Admins can unlock any tube
   * - Lock owner can unlock their own locks
   */
  const canUnlockTube = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      if (!tube.isLocked) return false;
      if (isAdmin) return true;
      return tube.lockedBy === userId;
    },
    [userId, isAdmin]
  );

  /**
   * Check if user can access (edit) a locked tube
   * - Admins can always access
   * - Lock owner can access
   * - Users with shared access can access
   * - Unlocked tubes are accessible to all (handled elsewhere)
   */
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

  /**
   * Check if user can share access to a locked tube
   * - Only lock owner or admin can share
   */
  const canShareTubeAccess = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      if (!tube.isLocked) return false;
      if (isAdmin) return true;
      return tube.lockedBy === userId;
    },
    [userId, isAdmin]
  );

  /**
   * Check if tube is locked out from user
   * Shows lock indicator when:
   * - Tube is locked
   * - User is not the lock owner
   * - User is not an admin
   * - User does not have shared access
   */
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

  /**
   * Check if tube is locked by the current user
   */
  const isLockedByCurrentUser = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      return tube.isLocked === true && tube.lockedBy === userId;
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
  };
}
