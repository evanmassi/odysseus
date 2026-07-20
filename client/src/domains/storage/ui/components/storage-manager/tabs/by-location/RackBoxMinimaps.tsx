/**
 * Rack Box Minimaps
 *
 * Renders a rack's boxes as occupancy minimap rows, each fed its own tubes.
 * Mounts only while the rack is expanded, so collapsed racks fetch nothing.
 */

import { useRackTubesByBox } from '../../../../../hooks/useRackTubesByBox';

import { BoxRow } from './BoxRow';

import type { RackConfiguration } from '@odysseus/shared-schemas';

interface RackBoxMinimapsProps {
  tankId: string;
  rack: RackConfiguration;
}

export function RackBoxMinimaps({ tankId, rack }: RackBoxMinimapsProps) {
  const tubesByBox = useRackTubesByBox(tankId, rack.id);

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
