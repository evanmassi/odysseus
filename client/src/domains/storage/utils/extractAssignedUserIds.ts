/**
 * Assigned User Extraction
 *
 * Collects unique user IDs from rack and box assignments in a lab configuration.
 */

import type { LabConfiguration } from '@odysseus/shared-schemas';

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
