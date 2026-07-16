/**
 * Effective Owner
 *
 * Resolves a storage resource's owner through the box→rack inheritance cascade:
 * `undefined` inherits the parent's owner; `null` (explicitly common) and a
 * concrete id are returned as-is.
 */

export function getEffectiveOwnerId(
  assignedUserId: string | null | undefined,
  parentAssignedUserId?: string | null
): string | null | undefined {
  return assignedUserId === undefined ? parentAssignedUserId : assignedUserId;
}
