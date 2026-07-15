/**
 * Tube Access Control Hook
 *
 * Client-side permission checks for tube locking operations.
 * Mirrors server-side AccessControlService logic for UI feedback.
 */

import { useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';

import type { TubeData } from '@odysseus/shared-schemas';

interface UseTubeAccessControlResult {
  canLockTube: (tube: TubeData) => boolean;
  canUnlockTube: (tube: TubeData) => boolean;
  canShareTubeAccess: (tube: TubeData) => boolean;
  isLockedOutFrom: (tube: TubeData) => boolean;
  isLockedByCurrentUser: (tube: TubeData) => boolean;
  hasExplicitSharedAccess: (tube: TubeData) => boolean;
}

export function useTubeAccessControl(
  currentUser: { id: string; role?: string } | null | undefined
): UseTubeAccessControlResult {
  const isAdmin = useMemo(() => isAdminRole(currentUser?.role), [currentUser?.role]);
  const userId = currentUser?.id;

  const canLockTube = useCallback(
    (tube: TubeData): boolean => {
      if (!userId) return false;
      // Optimistic: the server's AccessControlService enforces assigned-space rules and rejects
      // locking a tube in another user's box/rack; that denial surfaces as an error toast.
      return !tube.isLocked;
    },
    [userId]
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
    canShareTubeAccess,
    isLockedOutFrom,
    isLockedByCurrentUser,
    hasExplicitSharedAccess,
  };
}
