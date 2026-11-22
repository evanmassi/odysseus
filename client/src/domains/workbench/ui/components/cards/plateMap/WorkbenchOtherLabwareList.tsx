import { useMemo, type KeyboardEvent } from 'react';

import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import { OTHER_LABWARE } from '../../../../utils/plateMap/labwareCatalog';
import { SHAPE_METRICS } from '../../../../utils/plateMap/labwareSizing';
import { sharedByAll, type StainSamples } from '../../../../utils/plateMap/stainLayout';
import { dimmedForStain, type PlateStain } from '../../../../utils/plateMap/stainSide';
import { wellColor, wellLine } from '../../../../utils/plateMap/wellContents';

import { useWellPointerActions } from './useWellPointerActions';
import { WellTooltipSourceContext } from './wellTooltipSource';
import { WorkbenchOtherLabwareButton, type OtherLabwareView } from './WorkbenchOtherLabwareButton';

import type { WellSelection } from './useWellSelection';
import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { DonorSummary } from '../../../../utils/materials/materialDonors';
import type { LineLayer } from '../../../../utils/plateMap/plateLayers';
import type { PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';
import type { PlateLine, PlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchOtherLabwareListProps {
  card: PlateMapCard;
  sheet: PlateMapSheet;
  colorLine: PlateLine | undefined;
  layers: readonly LineLayer[];
  scale: number;
  board: SolvedBoard;
  donorSummaries: readonly DonorSummary[];
  selection: WellSelection;
  stains: ReadonlyMap<string, PlateStain>;
  stainSamples: StainSamples | undefined;
  cutKeys: ReadonlySet<string>;
  copiedKeys: ReadonlySet<string>;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
  onOpenMenu: (key: string, at: { x: number; y: number }) => void;
}

export function WorkbenchOtherLabwareList({
  card,
  sheet,
  colorLine,
  layers,
  scale,
  board,
  donorSummaries,
  selection,
  stains,
  stainSamples,
  cutKeys,
  copiedKeys,
  onKeyDown,
  onOpenWell,
  onOpenMenu,
}: WorkbenchOtherLabwareListProps) {
  const actions = useWellPointerActions(sheet, selection, onOpenWell, onOpenMenu);
  const labwareRowViews = useMemo(
    () =>
      card.sets.map((set, row) => {
        const labware = OTHER_LABWARE[set.vessel];
        const width = SHAPE_METRICS[labware.shape].width * labware.scale * scale;
        return {
          id: set.id,
          labware: sheet.positions
            .filter(position => position.row === row)
            .map((position): OtherLabwareView => {
              const wells = stainSamples?.get(position.key) ?? [position.key];
              const stain = stainSamples && stains.get(card.stain[position.key] ?? '');
              const color = sharedByAll(wells, well => wellColor(card, well, colorLine));
              const stainLook = stain ? 'stained' : wells.length ? 'unassigned' : undefined;
              const heading = [
                labware.label,
                wells.length > 1 && `pooled ×${wells.length}`,
                stainLook && (stain?.name ?? 'no stain assigned'),
              ];
              return {
                key: position.key,
                shape: labware.shape,
                width,
                sizeLabel: labware.short,
                tooltipHeading: stainSamples ? heading.filter(Boolean).join(' · ') : labware.label,
                lines: card.lines.flatMap(line => {
                  const shown = sharedByAll(wells, well => wellLine(card, well, line, board));
                  return shown ? [shown] : [];
                }),
                color: stainSamples ? dimmedForStain(color) : color,
                stainLook: stainSamples ? stainLook : undefined,
                wellBorderColor: stain?.color,
                poolSize: wells.length > 1 ? wells.length : undefined,
                isCut: cutKeys.has(position.key),
                isCopied: copiedKeys.has(position.key),
              };
            }),
        };
      }),
    [card, sheet, colorLine, scale, board, stains, stainSamples, cutKeys, copiedKeys]
  );
  const labwareRows = useStructuralSharing(labwareRowViews);
  const isStainSide = stainSamples !== undefined;
  const tooltipSource = useMemo(
    () => ({ card, sheet, layers, board, donorSummaries, stains, isStainSide }),
    [card, sheet, layers, board, donorSummaries, stains, isStainSide]
  );

  return (
    <WellTooltipSourceContext.Provider value={tooltipSource}>
      <div
        role="grid"
        aria-label="Labware"
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
        {labwareRows.map(labwareRow => (
          <div
            key={labwareRow.id}
            role="row"
            className="flex flex-wrap items-end gap-x-3.5 gap-y-4"
          >
            {labwareRow.labware.map(view => (
              <WorkbenchOtherLabwareButton
                key={view.key}
                view={view}
                isSelected={selection.keys.has(view.key)}
                actions={actions}
              />
            ))}
          </div>
        ))}
      </div>
    </WellTooltipSourceContext.Provider>
  );
}
