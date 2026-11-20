import { useMemo, type CSSProperties, type KeyboardEvent } from 'react';

import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import {
  bandShapes,
  plateGeometry,
  plateHeight,
  plateWidth,
  type PlateGeometry,
} from '../../../../utils/vessels/plateGeometry';
import { wellStripes } from '../../../../utils/vessels/plateLayers';
import {
  isRearranged,
  sharedByAll,
  type StainOccupants,
} from '../../../../utils/vessels/stainLayout';
import { dimmedForStain, type StainMix } from '../../../../utils/vessels/stainSide';
import { rowLetter, type VesselSheet } from '../../../../utils/vessels/vesselTabs';
import { wellColor, wellLine } from '../../../../utils/vessels/wellContents';
import { isWellFilled, selectionName } from '../../../../utils/vessels/wellSelection';

import { useWellPointerActions } from './useWellPointerActions';
import { pressModifiers } from './useWellSelection';
import { WellTooltipSourceContext } from './wellTooltipSource';
import {
  PART_SEPARATOR,
  WorkbenchPlateWellButton,
  WHOLE_WELL,
  type PlateWellView,
  type WellMarks,
} from './WorkbenchPlateWellButton';

import type { WellSelection } from './useWellSelection';
import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { SourceSummary } from '../../../../utils/materials/materialSources';
import type { LineLayer, PlateBand } from '../../../../utils/vessels/plateLayers';
import type { ReplicateMerges } from '../../../../utils/vessels/replicateMerges';
import type { WellSize } from '../../../../utils/vessels/vesselSizing';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateTableProps {
  block: VesselMapBlock;
  sheet: VesselSheet;
  colorLine: PlateLine | undefined;
  layers: readonly LineLayer[];
  bands: PlateBand[];
  size: WellSize;
  calculation: BoardCalculation;
  sources: readonly SourceSummary[];
  selection: WellSelection;
  merges: ReplicateMerges;
  mixes: ReadonlyMap<string, StainMix>;
  stainOccupants: StainOccupants | undefined;
  cutKeys: ReadonlySet<string>;
  copiedKeys: ReadonlySet<string>;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
  onOpenMenu: (key: string, at: { x: number; y: number }) => void;
}

const marksOf = (view: PlateWellView, keys: ReadonlySet<string>): WellMarks => {
  const wellKeys = view.merged?.keys ?? [view.key];
  const parts = wellKeys.filter(key => keys.has(key));
  if (!parts.length) return undefined;
  return parts.length === wellKeys.length ? WHOLE_WELL : parts.join(PART_SEPARATOR);
};

const HEADER =
  'flex items-center justify-center gap-1 font-mono text-label-2xs text-muted-foreground transition-colors hover:text-primary';
const TAG_TEXT = '#11141a';

interface BandOverlayProps {
  bands: PlateBand[];
  geometry: PlateGeometry;
  isDimmed: boolean;
}

function BandOverlay({ bands, geometry, isDimmed }: BandOverlayProps) {
  const shapes = bandShapes(bands, geometry);
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 text-label-2xs ${isDimmed ? 'opacity-40' : ''}`}
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
        <rect key={`ring-${index}`} {...box} fill="none" stroke={color} strokeWidth={1.8} />
      ))}
      {shapes.tags.map(({ x, y, width, text, color }, index) => (
        <g key={`tag-${index}`}>
          <rect x={x} y={y - 9} width={width} height={15} fill={color} />
          <text x={x + 6} y={y + 2} fill={TAG_TEXT}>
            {text}
          </text>
        </g>
      ))}
      {shapes.wellTags.map(({ x, y, text, color }, index) => (
        <text
          key={`well-tag-${index}`}
          x={x}
          y={y}
          fill={color}
          stroke={TAG_TEXT}
          strokeWidth={3}
          paintOrder="stroke"
          className="font-semibold"
        >
          {text}
        </text>
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
  layers,
  bands,
  size,
  calculation,
  sources,
  selection,
  merges,
  mixes,
  stainOccupants,
  cutKeys,
  copiedKeys,
  onKeyDown,
  onOpenWell,
  onOpenMenu,
}: WorkbenchPlateTableProps) {
  const actions = useWellPointerActions(sheet, selection, onOpenWell, onOpenMenu);
  const views = useMemo(
    () =>
      sheet.spots.flatMap((spot): PlateWellView[] => {
        const merged = merges.anchors.get(spot.key);
        if (!merged && merges.covered.has(spot.key)) return [];
        const where = merged
          ? `${selectionName(sheet, new Set(merged.keys))} · ${merged.keys.length} wells`
          : spot.label;
        const place = {
          key: spot.key,
          row: spot.row,
          col: spot.col,
          merged,
        };
        if (!stainOccupants) {
          return [
            {
              ...place,
              tooltipHeading: where,
              shownLine: colorLine && wellLine(block, spot.key, colorLine, calculation),
              isFilled: isWellFilled(block, spot.key),
              color: wellColor(block, spot.key, colorLine),
              stripes: wellStripes(block, spot.key, layers),
              stainLook: undefined,
              ringColor: undefined,
              poolSize: undefined,
            },
          ];
        }
        const wells = stainOccupants.get(spot.key) ?? [];
        const isInUse = wells.length > 0;
        const mix = mixes.get(block.stain[spot.key] ?? '');
        const heading = [
          where,
          wells.length > 1 && `pooled ×${wells.length}`,
          (mix !== undefined || isInUse) && (mix?.name ?? 'not stained'),
        ];
        return [
          {
            ...place,
            tooltipHeading: heading.filter(Boolean).join(' · '),
            shownLine:
              colorLine &&
              sharedByAll(wells, well => wellLine(block, well, colorLine, calculation)),
            isFilled: isInUse,
            color: dimmedForStain(sharedByAll(wells, well => wellColor(block, well, colorLine))),
            stripes: (sharedByAll(wells, well => wellStripes(block, well, layers)) ?? []).map(
              dimmedForStain
            ),
            stainLook: mix ? 'stained' : isInUse ? 'unstained' : undefined,
            ringColor: mix?.color,
            poolSize: wells.length > 1 ? wells.length : undefined,
          },
        ];
      }),
    [block, sheet, colorLine, layers, calculation, merges, mixes, stainOccupants]
  );
  const wells = useStructuralSharing(views);
  const isStainSide = stainOccupants !== undefined;
  const tooltipSource = useMemo(
    () => ({ block, sheet, layers, calculation, sources, mixes, isStainSide }),
    [block, sheet, layers, calculation, sources, mixes, isStainSide]
  );
  const showsAssayMarks = !isStainSide || !isRearranged(block, sheet);
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
    <WellTooltipSourceContext.Provider value={tooltipSource}>
      <div className="flex justify-center">
        <div
          role="grid"
          aria-label="Plate wells"
          data-focus="wells"
          aria-multiselectable
          className="selection-pulse relative grid select-none gap-1 outline-none"
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
              onClick={event => selection.selectColumn(col, pressModifiers(event))}
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
              onClick={event => selection.selectRow(row, pressModifiers(event))}
            >
              {rowLetter(row)}
            </button>
          ))}
          {wells.map(view => (
            <WorkbenchPlateWellButton
              key={view.key}
              view={view}
              density={size.density}
              selected={marksOf(view, selection.keys)}
              cut={marksOf(view, cutKeys)}
              copied={marksOf(view, copiedKeys)}
              actions={actions}
            />
          ))}
          {bands.length > 0 && showsAssayMarks && (
            <BandOverlay bands={bands} geometry={geometry} isDimmed={isStainSide} />
          )}
        </div>
      </div>
    </WellTooltipSourceContext.Provider>
  );
}
