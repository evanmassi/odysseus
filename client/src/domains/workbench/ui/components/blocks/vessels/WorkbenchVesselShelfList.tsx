import type { KeyboardEvent } from 'react';

import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import { LOOSE_VESSELS } from '../../../../utils/vessels/vesselCatalog';
import { SHAPE_METRICS } from '../../../../utils/vessels/vesselSizing';
import { wellColor, wellDetails, wellLine } from '../../../../utils/vessels/wellContents';

import { useWellPointerActions } from './useWellPointerActions';
import { WorkbenchShelfVesselButton, type ShelfVesselView } from './WorkbenchShelfVesselButton';

import type { WellSelection } from './useWellSelection';
import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { VesselSheet } from '../../../../utils/vessels/vesselTabs';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchVesselShelfListProps {
  block: VesselMapBlock;
  sheet: VesselSheet;
  colorLine: PlateLine | undefined;
  scale: number;
  calculation: BoardCalculation;
  selection: WellSelection;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
}

export function WorkbenchVesselShelfList({
  block,
  sheet,
  colorLine,
  scale,
  calculation,
  selection,
  onKeyDown,
  onOpenWell,
}: WorkbenchVesselShelfListProps) {
  const actions = useWellPointerActions(sheet, selection, onOpenWell);
  const shelves = useStructuralSharing(
    block.sets.map((set, row) => {
      const vessel = LOOSE_VESSELS[set.vessel];
      const width = SHAPE_METRICS[vessel.shape].width * vessel.scale * scale;
      return {
        id: set.id,
        vessels: sheet.spots
          .filter(spot => spot.row === row)
          .map(
            (spot): ShelfVesselView => ({
              key: spot.key,
              shape: vessel.shape,
              width,
              sizeLabel: vessel.short,
              tooltipLines: [vessel.label, ...wellDetails(block, spot.key, calculation)],
              lines: block.lines.flatMap(line => {
                const shown = wellLine(block, spot.key, line, calculation);
                return shown ? [shown] : [];
              }),
              color: wellColor(block, spot.key, colorLine),
            })
          ),
      };
    })
  );

  return (
    <div
      role="grid"
      aria-label="Vessels"
      data-focus="wells"
      aria-multiselectable
      className="flex select-none flex-wrap items-end gap-x-8 gap-y-5 outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        event.currentTarget.focus({ preventScroll: true });
        if (event.target === event.currentTarget) selection.clear();
      }}
    >
      {shelves.map(shelf => (
        <div key={shelf.id} role="row" className="flex flex-wrap items-end gap-x-3.5 gap-y-4">
          {shelf.vessels.map(view => (
            <WorkbenchShelfVesselButton
              key={view.key}
              view={view}
              isSelected={selection.keys.has(view.key)}
              actions={actions}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
