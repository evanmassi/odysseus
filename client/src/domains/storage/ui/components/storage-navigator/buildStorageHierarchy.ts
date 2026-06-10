/**
 * Storage Hierarchy Builder
 *
 * Maps lab equipment config into the navigator's lightweight StorageHierarchy
 * view-model — display names resolved, position-less boxes dropped.
 */

import { formatStorageDisplayName } from '@odysseus/shared-schemas';

import type { StorageHierarchy } from './storageNavigatorTypes';
import type { TankConfiguration } from '@domains/storage';

export function buildStorageHierarchy(tanks: TankConfiguration[]): StorageHierarchy {
  return {
    tanks: tanks.map(tank => ({
      id: tank.id,
      name: tank.name,
      racks: tank.racks.map(rack => ({
        id: rack.id,
        name: formatStorageDisplayName(rack.name, rack.customLabel),
        assignedUserId: rack.assignedUserId,
        boxes: rack.boxes
          .filter(box => box.position !== undefined)
          .map(box => ({
            id: box.id,
            name: formatStorageDisplayName(box.name, box.customLabel),
            position: box.position!,
            assignedUserId: box.assignedUserId,
            gridConfig: box.gridConfig,
          })),
      })),
    })),
  };
}
