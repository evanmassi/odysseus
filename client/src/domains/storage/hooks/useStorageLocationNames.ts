/**
 * Storage Location Names
 *
 * Resolves location IDs to display names with custom label formatting.
 */
import { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';

import { useStorageData } from './useStorageData';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
} from '@odysseus/shared-schemas';

export interface LocationDisplayNames {
  tankName: string;
  rackName: string;
  boxName: string;
  tank: TankConfiguration | undefined;
  rack: RackConfiguration | undefined;
  box: BoxConfiguration | undefined;
}

export function useStorageLocationNames(
  tankId: string | null | undefined,
  rackId?: string | null,
  boxId?: string | null
): LocationDisplayNames {
  const { getCurrentTanks } = useStorageData();

  return useMemo(() => {
    const tanks = getCurrentTanks();

    const tank = tankId ? tanks.find(t => t.id === tankId) : undefined;
    const tankName = tank?.name ?? (tankId ? `Tank ${tankId}` : 'Unknown Tank');

    const rack = tank && rackId ? tank.racks?.find(r => r.id === rackId) : undefined;
    const rackGenericName = rack?.name ?? (rackId ? `Rack ${rackId}` : 'Unknown Rack');
    const rackName = formatResourceDisplayName(rackGenericName, rack?.customLabel);

    const box = rack && boxId ? rack.boxes?.find(b => b.id === boxId) : undefined;
    const boxGenericName = box?.name ?? (boxId ? `Box ${boxId}` : 'Unknown Box');
    const boxName = formatResourceDisplayName(boxGenericName, box?.customLabel);

    return {
      tankName,
      rackName,
      boxName,
      tank,
      rack,
      box,
    };
  }, [getCurrentTanks, tankId, rackId, boxId]);
}
