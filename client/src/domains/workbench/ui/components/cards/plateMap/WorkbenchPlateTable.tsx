import { useMemo, type CSSProperties, type KeyboardEvent } from 'react';

import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import {
  indicatorShapes,
  plateGeometry,
  plateHeight,
  plateWidth,
  type PlateGeometry,
} from '../../../../utils/plateMap/plateGeometry';
import { wellStripes } from '../../../../utils/plateMap/plateLayers';
import { rowLetter, type PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';
import {
  isRearranged,
  sharedByAll,
  type StainSamples,
} from '../../../../utils/plateMap/stainLayout';
import { dimmedForStain, type PlateStain } from '../../../../utils/plateMap/stainSide';
import { wellColor, wellLine } from '../../../../utils/plateMap/wellContents';
import { isWellFilled, selectionName } from '../../../../utils/plateMap/wellSelection';

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
import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { DonorSummary } from '../../../../utils/materials/materialDonors';
import type { WellSize } from '../../../../utils/plateMap/labwareSizing';
import type { LineLayer, PlateIndicator } from '../../../../utils/plateMap/plateLayers';
import type { ReplicatesShownAsOne } from '../../../../utils/plateMap/replicatesShownAsOne';
import type { PlateLine, PlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchPlateTableProps {
  card: PlateMapCard;
  sheet: PlateMapSheet;
  colorLine: PlateLine | undefined;
  layers: readonly LineLayer[];
  indicators: PlateIndicator[];
  size: WellSize;
  board: SolvedBoard;
  donorSummaries: readonly DonorSummary[];
  selection: WellSelection;
  shownAsOne: ReplicatesShownAsOne;
  stains: ReadonlyMap<string, PlateStain>;
  stainSamples: StainSamples | undefined;
  cutKeys: ReadonlySet<string>;
  copiedKeys: ReadonlySet<string>;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
  onOpenMenu: (key: string, at: { x: number; y: number }) => void;
}

const marksOf = (view: PlateWellView, keys: ReadonlySet<string>): WellMarks => {
  const wellKeys = view.replicateGroup?.keys ?? [view.key];
  const parts = wellKeys.filter(key => keys.has(key));
  if (!parts.length) return undefined;
  return parts.length === wellKeys.length ? WHOLE_WELL : parts.join(PART_SEPARATOR);
};

const HEADER =
  'flex items-center justify-center gap-1 font-mono text-label-2xs text-muted-foreground transition-colors hover:text-primary';
const TAG_TEXT = '#11141a';

interface IndicatorOverlayProps {
  indicators: PlateIndicator[];
  geometry: PlateGeometry;
  isDimmed: boolean;
}

function IndicatorOverlay({ indicators, geometry, isDimmed }: IndicatorOverlayProps) {
  const shapes = indicatorShapes(indicators, geometry);
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
  card,
  sheet,
  colorLine,
  layers,
  indicators,
  size,
  board,
  donorSummaries,
  selection,
  shownAsOne,
  stains,
  stainSamples,
  cutKeys,
  copiedKeys,
  onKeyDown,
  onOpenWell,
  onOpenMenu,
}: WorkbenchPlateTableProps) {
  const actions = useWellPointerActions(sheet, selection, onOpenWell, onOpenMenu);
  const views = useMemo(
    () =>
      sheet.positions.flatMap((position): PlateWellView[] => {
        const replicateGroup = shownAsOne.anchors.get(position.key);
        if (!replicateGroup && shownAsOne.covered.has(position.key)) return [];
        const where = replicateGroup
          ? `${selectionName(sheet, new Set(replicateGroup.keys))} · ${replicateGroup.keys.length} wells`
          : position.label;
        const place = {
          key: position.key,
          row: position.row,
          col: position.col,
          replicateGroup,
        };
        if (!stainSamples) {
          return [
            {
              ...place,
              tooltipHeading: where,
              shownLine: colorLine && wellLine(card, position.key, colorLine, board),
              isFilled: isWellFilled(card, position.key),
              color: wellColor(card, position.key, colorLine),
              stripes: wellStripes(card, position.key, layers),
              stainLook: undefined,
              wellBorderColor: undefined,
              poolSize: undefined,
            },
          ];
        }
        const wells = stainSamples.get(position.key) ?? [];
        const isInUse = wells.length > 0;
        const stain = stains.get(card.stain[position.key] ?? '');
        const heading = [
          where,
          wells.length > 1 && `pooled ×${wells.length}`,
          (stain !== undefined || isInUse) && (stain?.name ?? 'no stain assigned'),
        ];
        return [
          {
            ...place,
            tooltipHeading: heading.filter(Boolean).join(' · '),
            shownLine:
              colorLine && sharedByAll(wells, well => wellLine(card, well, colorLine, board)),
            isFilled: isInUse,
            color: dimmedForStain(sharedByAll(wells, well => wellColor(card, well, colorLine))),
            stripes: (sharedByAll(wells, well => wellStripes(card, well, layers)) ?? []).map(
              dimmedForStain
            ),
            stainLook: stain ? 'stained' : isInUse ? 'unassigned' : undefined,
            wellBorderColor: stain?.color,
            poolSize: wells.length > 1 ? wells.length : undefined,
          },
        ];
      }),
    [card, sheet, colorLine, layers, board, shownAsOne, stains, stainSamples]
  );
  const wells = useStructuralSharing(views);
  const isStainSide = stainSamples !== undefined;
  const tooltipSource = useMemo(
    () => ({ card, sheet, layers, board, donorSummaries, stains, isStainSide }),
    [card, sheet, layers, board, donorSummaries, stains, isStainSide]
  );
  const showsAssayIndicators = !isStainSide || !isRearranged(card, sheet);
  const geometry = plateGeometry(size, sheet.rows, sheet.cols, indicators);
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
          {indicators.length > 0 && showsAssayIndicators && (
            <IndicatorOverlay indicators={indicators} geometry={geometry} isDimmed={isStainSide} />
          )}
        </div>
      </div>
    </WellTooltipSourceContext.Provider>
  );
}
