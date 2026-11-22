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
import type { SourceSummary } from '../../../../utils/materials/materialSources';
import type { LineLayer } from '../../../../utils/plateMap/plateLayers';
import type { PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';
import type { PlateLine, PlateMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchOtherLabwareListProps {
  block: PlateMapBlock;
  sheet: PlateMapSheet;
  colorLine: PlateLine | undefined;
  layers: readonly LineLayer[];
  scale: number;
  board: SolvedBoard;
  sources: readonly SourceSummary[];
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
  block,
  sheet,
  colorLine,
  layers,
  scale,
  board,
  sources,
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
      block.sets.map((set, row) => {
        const labware = OTHER_LABWARE[set.vessel];
        const width = SHAPE_METRICS[labware.shape].width * labware.scale * scale;
        return {
          id: set.id,
          labware: sheet.positions
            .filter(position => position.row === row)
            .map((position): OtherLabwareView => {
              const wells = stainSamples?.get(position.key) ?? [position.key];
              const stain = stainSamples && stains.get(block.stain[position.key] ?? '');
              const color = sharedByAll(wells, well => wellColor(block, well, colorLine));
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
                lines: block.lines.flatMap(line => {
                  const shown = sharedByAll(wells, well => wellLine(block, well, line, board));
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
    [block, sheet, colorLine, scale, board, stains, stainSamples, cutKeys, copiedKeys]
  );
  const labwareRows = useStructuralSharing(labwareRowViews);
  const isStainSide = stainSamples !== undefined;
  const tooltipSource = useMemo(
    () => ({ block, sheet, layers, board, sources, stains, isStainSide }),
    [block, sheet, layers, board, sources, stains, isStainSide]
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
