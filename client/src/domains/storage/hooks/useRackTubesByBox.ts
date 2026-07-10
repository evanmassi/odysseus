/**
 * Rack Tubes By Box
 *
 * Loads one rack's slim per-tube colors and groups them by box id, so each box
 * minimap can render its own tubes.
 */

import { useMemo } from 'react';

import { useTubesByRack } from '@domains/tubes';

import type { RackTube } from '@odysseus/shared-schemas';

export function useRackTubesByBox(tankId: string, rackId: string): Map<string, RackTube[]> {
  const { data: tubes = [] } = useTubesByRack(tankId, rackId);

  return useMemo(() => {
    const grouped = new Map<string, RackTube[]>();
    for (const tube of tubes) {
      const list = grouped.get(tube.boxId);
      if (list) {
        list.push(tube);
      } else {
        grouped.set(tube.boxId, [tube]);
      }
    }
    return grouped;
  }, [tubes]);
}
