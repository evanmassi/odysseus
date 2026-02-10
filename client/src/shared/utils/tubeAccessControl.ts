/**
 * Tube Access Control Utilities
 *
 * Client-side UX checks for tube modification. Server remains the authority.
 */

import type { TubeData } from '@odysseus/shared-schemas';

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
  // Phase 1: Check base access (container OR shared)
  const hasContainerAccess = !isViewOnlySpace;
  const hasSharedAccess = currentUserId
    ? (tube.sharedWithUserIds?.includes(currentUserId) ?? false)
    : false;

  if (!hasContainerAccess && !hasSharedAccess) {
    return false;
  }

  // Phase 2: If tube is locked, verify lock access (admins bypass)
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
  /** Whether all tubes can be modified */
  canModifyAll: boolean;
  /** Number of tubes that cannot be modified */
  blockedCount: number;
  /** Number of tubes blocked due to lock (subset of blockedCount) */
  lockedCount: number;
  /** Tubes that can be modified */
  modifiable: TubeData[];
  /** Tubes that cannot be modified */
  blocked: TubeData[];
}

/**
 * Check if a tube is blocked specifically due to lock (not container access)
 * Used to provide accurate error messages
 */
function isBlockedByLock(
  tube: TubeData,
  currentUserId: string | undefined,
  isViewOnlySpace: boolean,
  isAdmin = false
): boolean {
  if (!tube.isLocked) return false;
  if (isAdmin) return false;

  // Check if user has base access (would pass phase 1)
  const hasContainerAccess = !isViewOnlySpace;
  const hasSharedAccess = currentUserId
    ? (tube.sharedWithUserIds?.includes(currentUserId) ?? false)
    : false;
  if (!hasContainerAccess && !hasSharedAccess) return false; // Blocked by container, not lock

  // User has base access but tube is locked - check lock access
  if (!currentUserId) return true;
  const isLockOwner = tube.lockedBy === currentUserId;
  const hasLockSharedAccess = tube.sharedWithUserIds?.includes(currentUserId) ?? false;

  return !isLockOwner && !hasLockSharedAccess;
}

/**
 * Check if user can modify all tubes in a selection
 *
 * For batch operations (edit, delete, copy, cut), we require ALL tubes
 * to be modifiable. This prevents partial operations that confuse users.
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

/**
 * Get a user-friendly message explaining why modification is blocked
 * Distinguishes between lock-based and container-based blocking
 */
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
