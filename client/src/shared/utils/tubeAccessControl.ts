/**
 * Tube Access Control Utilities
 *
 * Client-side UX checks for tube modification operations.
 * Server remains the authority - these are purely for UI feedback.
 *
 * Use cases:
 * - Disable context menu items for non-modifiable tubes
 * - Block operations before they reach the server
 * - Provide meaningful error messages to users
 */

import type { TubeData } from '@odysseus/shared-schemas';

/**
 * Check if user can modify a specific tube
 *
 * Logic:
 * - If user owns the container (!isViewOnlySpace) → can modify
 * - If view-only space + user has shared access → can modify
 * - If view-only space + no shared access → cannot modify
 *
 * @param tube - The tube to check
 * @param currentUserId - The current user's ID
 * @param isViewOnlySpace - Whether the container is assigned to another user
 */
export function canModifyTube(
  tube: TubeData,
  currentUserId: string | undefined,
  isViewOnlySpace: boolean
): boolean {
  // User owns the container - can modify anything
  if (!isViewOnlySpace) return true;

  // View-only space requires shared access
  if (!currentUserId) return false;
  return tube.sharedWithUserIds?.includes(currentUserId) ?? false;
}

export interface BatchModifyResult {
  /** Whether all tubes can be modified */
  canModifyAll: boolean;
  /** Number of tubes that cannot be modified */
  blockedCount: number;
  /** Tubes that can be modified */
  modifiable: TubeData[];
  /** Tubes that cannot be modified */
  blocked: TubeData[];
}

/**
 * Check if user can modify all tubes in a selection
 *
 * For batch operations (edit, delete, copy, cut), we require ALL tubes
 * to be modifiable. This prevents partial operations that confuse users.
 *
 * @param tubes - The tubes to check
 * @param currentUserId - The current user's ID
 * @param isViewOnlySpace - Whether the container is assigned to another user
 */
export function canModifyAllTubes(
  tubes: TubeData[],
  currentUserId: string | undefined,
  isViewOnlySpace: boolean
): BatchModifyResult {
  const modifiable: TubeData[] = [];
  const blocked: TubeData[] = [];

  for (const tube of tubes) {
    if (canModifyTube(tube, currentUserId, isViewOnlySpace)) {
      modifiable.push(tube);
    } else {
      blocked.push(tube);
    }
  }

  return {
    canModifyAll: blocked.length === 0,
    blockedCount: blocked.length,
    modifiable,
    blocked,
  };
}

/**
 * Get a user-friendly message explaining why modification is blocked
 *
 * @param blockedCount - Number of tubes that cannot be modified
 */
export function getBlockedModificationMessage(blockedCount: number): string {
  if (blockedCount === 1) {
    return 'Cannot modify selection. 1 tube is in a space assigned to another user without shared access.';
  }
  return `Cannot modify selection. ${blockedCount} tubes are in a space assigned to another user without shared access.`;
}
