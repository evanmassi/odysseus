/**
 * Rack Box Minimaps
 *
 * Loads one open rack's slim per-tube colors once and hands each box its own
 * tubes, so the box rows render occupancy minimaps. Mounts only while the rack
 * is expanded, so collapsed racks fetch nothing.
 */

import { useMemo } from 'react';

import { useTubesByRack } from '@domains/tubes/hooks';

import { BoxRow } from './BoxRow';

import type { RackConfiguration } from '@domains/storage';
import type { RackTube } from '@odysseus/shared-schemas';

interface RackBoxMinimapsProps {
  tankId: string;
  rack: RackConfiguration;
}

export function RackBoxMinimaps({ tankId, rack }: RackBoxMinimapsProps) {
  const { data: tubes = [] } = useTubesByRack(tankId, rack.id);

  const tubesByBox = useMemo(() => {
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

  return (
    <>
      {rack.boxes.map(box => (
        <BoxRow
          key={box.id}
          box={box}
          rack={rack}
          tankId={tankId}
          rackId={rack.id}
          tubes={tubesByBox.get(box.id) ?? []}
        />
      ))}
    </>
  );
}
