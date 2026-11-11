import type { CSSProperties, KeyboardEvent } from 'react';

import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import {
  bandShapes,
  plateGeometry,
  plateHeight,
  plateWidth,
  type PlateGeometry,
} from '../../../../utils/vessels/plateGeometry';
import { rowLetter, type VesselSheet } from '../../../../utils/vessels/vesselTabs';
import { wellColor, wellDetails, wellLine } from '../../../../utils/vessels/wellContents';
import { selectionName } from '../../../../utils/vessels/wellSelection';

import { useWellPointerActions } from './useWellPointerActions';
import { WorkbenchPlateWellButton, type PlateWellView } from './WorkbenchPlateWellButton';

import type { WellSelection } from './useWellSelection';
import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { PlateBand } from '../../../../utils/vessels/plateLayers';
import type { ReplicateMerges } from '../../../../utils/vessels/replicateMerges';
import type { WellSize } from '../../../../utils/vessels/vesselSizing';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateTableProps {
  block: VesselMapBlock;
  sheet: VesselSheet;
  colorLine: PlateLine | undefined;
  bands: PlateBand[];
  size: WellSize;
  calculation: BoardCalculation;
  selection: WellSelection;
  merges: ReplicateMerges;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
}

const HEADER =
  'flex items-center justify-center gap-1 font-mono text-label-2xs text-muted-foreground transition-colors hover:text-primary';
const TAG_TEXT = '#11141a';

function BandOverlay({ bands, geometry }: { bands: PlateBand[]; geometry: PlateGeometry }) {
  const shapes = bandShapes(bands, geometry);
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 text-label-2xs"
      width={plateWidth(geometry)}
      height={plateHeight(geometry)}
    >
      {shapes.areas.map(({ fill, edge, color }, index) => (
        <g key={`area-${index}`}>
          <path d={fill} fill={color} fillOpacity={0.09} />
          <path d={edge} fill="none" stroke={color} strokeOpacity={0.75} strokeWidth={1.2} />
        </g>
      ))}
      {shapes.rings.map(({ color, ...box }, index) => (
        <rect
          key={`ring-${index}`}
          {...box}
          rx={box.height / 2}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
        />
      ))}
      {shapes.tags.map(({ x, y, width, text, color }, index) => (
        <g key={`tag-${index}`}>
          <rect x={x} y={y - 9} width={width} height={15} fill={color} />
          <text x={x + 6} y={y + 2} fill={TAG_TEXT}>
            {text}
          </text>
        </g>
      ))}
      {shapes.topBrackets.map(({ path, x, y, text, color }, index) => (
        <g key={`top-${index}`}>
          <path d={path} fill="none" stroke={color} strokeWidth={1.4} />
          <text x={x} y={y} textAnchor="middle" fill={color}>
            {text}
          </text>
        </g>
      ))}
      {shapes.leftBrackets.map(({ path, x, y, text, color }, index) => (
        <g key={`left-${index}`}>
          <path d={path} fill="none" stroke={color} strokeWidth={1.4} />
          <text transform={`translate(${x} ${y}) rotate(-90)`} textAnchor="middle" fill={color}>
            {text}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function WorkbenchPlateTable({
  block,
  sheet,
  colorLine,
  bands,
  size,
  calculation,
  selection,
  merges,
  onKeyDown,
  onOpenWell,
}: WorkbenchPlateTableProps) {
  const actions = useWellPointerActions(sheet, selection, onOpenWell);
  const wells = useStructuralSharing(
    sheet.spots.flatMap((spot): PlateWellView[] => {
      const merged = merges.anchors.get(spot.key);
      if (!merged && merges.covered.has(spot.key)) return [];
      const details = wellDetails(block, spot.key, calculation);
      const where = merged
        ? `${selectionName(sheet, new Set(merged.keys))} · ${merged.keys.length} wells`
        : spot.label;
      return [
        {
          key: spot.key,
          row: spot.row,
          col: spot.col,
          merged,
          tooltipLines: [where, ...details],
          shownLine: colorLine && wellLine(block, spot.key, colorLine, calculation),
          isFilled: details.length > 0,
          color: wellColor(block, spot.key, colorLine),
        },
      ];
    })
  );
  const geometry = plateGeometry(size, sheet.rows, sheet.cols, bands);
  const style = {
    gridTemplateColumns: `${geometry.headerWidth}px repeat(${sheet.cols}, ${size.width}px)`,
    gridTemplateRows: `${geometry.headerHeight}px repeat(${sheet.rows}, ${size.height}px)`,
    paddingLeft: geometry.leftPad,
    paddingTop: geometry.topPad,
    paddingRight: geometry.edgePad,
    paddingBottom: geometry.edgePad,
  } as CSSProperties;

  return (
    <div className="flex justify-center">
      <div
        role="grid"
        aria-label="Plate wells"
        data-focus="wells"
        aria-multiselectable
        className="relative grid select-none gap-1 outline-none"
        style={style}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={event => {
          event.currentTarget.focus({ preventScroll: true });
          if (event.target === event.currentTarget) selection.clear();
        }}
      >
        <button
          type="button"
          aria-label="Select every well"
          className={HEADER}
          style={{ gridRow: 1, gridColumn: 1 }}
          onClick={selection.selectAll}
        />
        {Array.from({ length: sheet.cols }, (_, col) => (
          <button
            key={`col-${col}`}
            type="button"
            aria-label={`Select column ${col + 1}`}
            className={HEADER}
            style={{ gridRow: 1, gridColumn: col + 2 }}
            onClick={() => selection.selectColumn(col)}
          >
            {col + 1}
          </button>
        ))}
        {Array.from({ length: sheet.rows }, (_, row) => (
          <button
            key={`row-${row}`}
            type="button"
            aria-label={`Select row ${rowLetter(row)}`}
            className={HEADER}
            style={{ gridRow: row + 2, gridColumn: 1 }}
            onClick={() => selection.selectRow(row)}
          >
            {rowLetter(row)}
          </button>
        ))}
        {wells.map(view => (
          <WorkbenchPlateWellButton
            key={view.key}
            view={view}
            density={size.density}
            isSelected={selection.keys.has(view.key)}
            actions={actions}
          />
        ))}
        {bands.length > 0 && <BandOverlay bands={bands} geometry={geometry} />}
      </div>
    </div>
  );
}
