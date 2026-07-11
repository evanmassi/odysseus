/**
 * Navigator Occupancy
 *
 * Rolls the slim per-box tube counts up into box, rack, tank, and facility
 * totals so each scope in the navigator can show how full it is against its
 * physical capacity (derived from the box grid configs).
 */

import { getGridTotalPositions } from '../../../utils/gridHelpers';

import type { StorageHierarchy } from './storageNavigatorTypes';
import type { TubeLocationCount } from '@odysseus/shared-schemas';

interface Occupancy {
  filled: number;
  capacity: number;
}

export interface NavigatorOccupancy {
  facility: Occupancy;
  byTank: Map<string, Occupancy>;
  byRack: Map<string, Occupancy>;
  byBox: Map<string, Occupancy>;
}

export function rackOccupancyKey(tankId: string, rackId: string): string {
  return `${tankId}/${rackId}`;
}

export function boxOccupancyKey(tankId: string, rackId: string, boxId: string): string {
  return `${tankId}/${rackId}/${boxId}`;
}

export function computeNavigatorOccupancy(
  data: StorageHierarchy,
  counts: TubeLocationCount[]
): NavigatorOccupancy {
  const filledByBox = new Map<string, number>();
  for (const count of counts) {
    filledByBox.set(boxOccupancyKey(count.tankId, count.rackId, count.boxId), count.count);
  }

  const byTank = new Map<string, Occupancy>();
  const byRack = new Map<string, Occupancy>();
  const byBox = new Map<string, Occupancy>();
  const facility: Occupancy = { filled: 0, capacity: 0 };

  for (const tank of data.tanks) {
    const tankOccupancy: Occupancy = { filled: 0, capacity: 0 };

    for (const rack of tank.racks) {
      const rackOccupancy: Occupancy = { filled: 0, capacity: 0 };

      for (const box of rack.boxes) {
        const capacity = getGridTotalPositions(box.gridConfig);
        const filled = filledByBox.get(boxOccupancyKey(tank.id, rack.id, box.id)) ?? 0;
        byBox.set(boxOccupancyKey(tank.id, rack.id, box.id), { filled, capacity });
        rackOccupancy.filled += filled;
        rackOccupancy.capacity += capacity;
      }

      byRack.set(rackOccupancyKey(tank.id, rack.id), rackOccupancy);
      tankOccupancy.filled += rackOccupancy.filled;
      tankOccupancy.capacity += rackOccupancy.capacity;
    }

    byTank.set(tank.id, tankOccupancy);
    facility.filled += tankOccupancy.filled;
    facility.capacity += tankOccupancy.capacity;
  }

  return { facility, byTank, byRack, byBox };
}
