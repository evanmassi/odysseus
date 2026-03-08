/**
 * Tube Access Control Utilities
 *
 * Client-side UX checks for tube modification. Server remains the authority.
 */

import type { TubeData } from '@odysseus/shared-schemas';

function hasBaseAccess(
  tube: TubeData,
  currentUserId: string | undefined,
  isViewOnlySpace: boolean
): boolean {
  const hasContainerAccess = !isViewOnlySpace;
  const hasSharedAccess = currentUserId
    ? (tube.sharedWithUserIds?.includes(currentUserId) ?? false)
    : false;
  return hasContainerAccess || hasSharedAccess;
}

/**
 * Two-phase check mirroring server-side canAccessTubeForModification:
 * 1. Base access — container ownership OR shared access
 * 2. Lock access — lock owner, shared user, or admin bypass
 */
export function canModifyTube(
  tube: TubeData,
  currentUserId: string | undefined,
  isViewOnlySpace: boolean,
  isAdmin = false
): boolean {
  if (!hasBaseAccess(tube, currentUserId, isViewOnlySpace)) {
    return false;
  }

  if (tube.isLocked && !isAdmin) {
    if (!currentUserId) return false;
    const isLockOwner = tube.lockedBy === currentUserId;
    const hasLockSharedAccess = tube.sharedWithUserIds?.includes(currentUserId) ?? false;
    if (!isLockOwner && !hasLockSharedAccess) {
      return false;
    }
  }

  return true;
}

export interface BatchModifyResult {
  canModifyAll: boolean;
  blockedCount: number;
  lockedCount: number;
  modifiable: TubeData[];
  blocked: TubeData[];
}

/** Check if a tube is blocked specifically due to lock (not container access) */
function isBlockedByLock(
  tube: TubeData,
  currentUserId: string | undefined,
  isViewOnlySpace: boolean,
  isAdmin = false
): boolean {
  if (!tube.isLocked) return false;
  if (isAdmin) return false;
  if (!hasBaseAccess(tube, currentUserId, isViewOnlySpace)) return false;

  if (!currentUserId) return true;
  const isLockOwner = tube.lockedBy === currentUserId;
  const hasLockSharedAccess = tube.sharedWithUserIds?.includes(currentUserId) ?? false;

  return !isLockOwner && !hasLockSharedAccess;
}

/**
 * Requires ALL tubes to be modifiable — prevents partial batch operations
 * that confuse users.
 */
export function canModifyAllTubes(
  tubes: TubeData[],
  currentUserId: string | undefined,
  isViewOnlySpace: boolean,
  isAdmin = false
): BatchModifyResult {
  const modifiable: TubeData[] = [];
  const blocked: TubeData[] = [];
  let lockedCount = 0;

  for (const tube of tubes) {
    if (canModifyTube(tube, currentUserId, isViewOnlySpace, isAdmin)) {
      modifiable.push(tube);
    } else {
      blocked.push(tube);
      if (isBlockedByLock(tube, currentUserId, isViewOnlySpace, isAdmin)) {
        lockedCount++;
      }
    }
  }

  return {
    canModifyAll: blocked.length === 0,
    blockedCount: blocked.length,
    lockedCount,
    modifiable,
    blocked,
  };
}

/** Distinguishes between lock-based and container-based blocking */
export function getBlockedModificationMessage(result: BatchModifyResult): string {
  const { blockedCount, lockedCount } = result;
  const containerBlockedCount = blockedCount - lockedCount;

  if (blockedCount === 0) return '';

  const parts: string[] = [];

  if (lockedCount > 0) {
    parts.push(
      lockedCount === 1
        ? '1 tube is locked by another user'
        : `${lockedCount} tubes are locked by another user`
    );
  }

  if (containerBlockedCount > 0) {
    parts.push(
      containerBlockedCount === 1
        ? '1 tube is in a space without access'
        : `${containerBlockedCount} tubes are in a space without access`
    );
  }

  return `Cannot modify selection. ${parts.join(' and ')}.`;
}
