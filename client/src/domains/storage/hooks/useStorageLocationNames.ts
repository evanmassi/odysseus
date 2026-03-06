/**
 * Location Display Names Hook
 *
 * Resolves location IDs to display names.
 * Applies formatResourceDisplayName to combine admin names with user custom labels.
 */
import { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';

import { useStorageData } from './useStorageData';

export interface LocationDisplayNames {
  /** Formatted tank name */
  tankName: string;
  /** Formatted rack name with custom label if present */
  rackName: string;
  /** Formatted box name with custom label if present */
  boxName: string;
  /** Raw tank object for additional data access */
  tank: ReturnType<ReturnType<typeof useStorageData>['getCurrentTanks']>[number] | undefined;
  /** Raw rack object for additional data access */
  rack:
    | ReturnType<ReturnType<typeof useStorageData>['getCurrentTanks']>[number]['racks'][number]
    | undefined;
  /** Raw box object for additional data access */
  box:
    | ReturnType<
        ReturnType<typeof useStorageData>['getCurrentTanks']
      >[number]['racks'][number]['boxes'][number]
    | undefined;
}

/**
 * Resolves location IDs to formatted display names.
 *
 * Combines admin-set generic names with user custom labels using formatResourceDisplayName.
 */
export function useLocationDisplayNames(
  tankId: string | null | undefined,
  rackId?: string | null,
  boxId?: string | null
): LocationDisplayNames {
  const { getCurrentTanks } = useStorageData();

  return useMemo(() => {
    const tanks = getCurrentTanks();

    // Find tank
    const tank = tankId ? tanks.find(t => t.id === tankId) : undefined;
    const tankName = tank?.name ?? (tankId ? `Tank ${tankId}` : 'Unknown Tank');

    // Find rack
    const rack = tank && rackId ? tank.racks?.find(r => r.id === rackId) : undefined;
    const rackGenericName = rack?.name ?? (rackId ? `Rack ${rackId}` : 'Unknown Rack');
    const rackName = formatResourceDisplayName(rackGenericName, rack?.customLabel);

    // Find box
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
