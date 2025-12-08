import type { LabConfiguration } from '@domains/storage';

/**
 * Extracts all unique assigned user IDs from a lab configuration.
 * Collects IDs from both rack and box assignments.
 *
 * @param lab - The lab configuration to extract IDs from
 * @returns Array of unique user IDs
 */
export function extractAssignedUserIds(lab: LabConfiguration | null): string[] {
  if (!lab) return [];

  const ids = new Set<string>();

  for (const tank of lab.equipment.tanks) {
    for (const rack of tank.racks) {
      if (rack.assignedUserId) ids.add(rack.assignedUserId);
      for (const box of rack.boxes) {
        if (box.assignedUserId) ids.add(box.assignedUserId);
      }
    }
  }

  return Array.from(ids);
}
