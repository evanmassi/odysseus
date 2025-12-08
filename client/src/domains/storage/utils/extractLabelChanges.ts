import type { LabConfiguration } from '@odysseus/shared-schemas';

export interface LabelChange {
  type: 'rack' | 'box';
  tankId: string;
  rackId: string;
  boxId?: string;
  customLabel: string;
}

/**
 * Extracts label changes between original and updated lab configurations.
 *
 * Compares customLabel fields on racks and boxes to find what changed.
 * Used by handleSave to determine which labels need saving via dedicated endpoint.
 *
 * @param original - The original lab configuration (before edits)
 * @param updated - The updated lab configuration (with edits)
 * @returns Array of label changes to save
 */
export function extractLabelChanges(
  original: LabConfiguration,
  updated: LabConfiguration
): LabelChange[] {
  const changes: LabelChange[] = [];

  for (const tank of updated.equipment.tanks) {
    const originalTank = original.equipment.tanks.find(t => t.id === tank.id);
    if (!originalTank) continue;

    for (const rack of tank.racks) {
      const originalRack = originalTank.racks.find(r => r.id === rack.id);
      if (!originalRack) continue;

      // Check rack label change
      if (rack.customLabel !== originalRack.customLabel) {
        changes.push({
          type: 'rack',
          tankId: tank.id,
          rackId: rack.id,
          customLabel: rack.customLabel ?? '',
        });
      }

      // Check box label changes
      for (const box of rack.boxes) {
        const originalBox = originalRack.boxes.find(b => b.id === box.id);
        if (!originalBox) continue;

        if (box.customLabel !== originalBox.customLabel) {
          changes.push({
            type: 'box',
            tankId: tank.id,
            rackId: rack.id,
            boxId: box.id,
            customLabel: box.customLabel ?? '',
          });
        }
      }
    }
  }

  return changes;
}
