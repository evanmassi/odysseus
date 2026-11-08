import { isFilledCell, type PlateLine, type VesselMapBlock } from '@odysseus/shared-schemas';

import { wellLine, wellLineText } from './wellContents';

import type { VesselSheet } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';

export type ShownRole = Exclude<PlateLine['role'], 'auto'>;

interface LineLayer {
  line: PlateLine;
  role: ShownRole;
  texts: string[];
}

export function lineLayers(
  block: VesselMapBlock,
  colorLine: PlateLine | undefined,
  calculation: BoardCalculation
): LineLayer[] {
  const usedKeys = Object.keys(block.cells).filter(key =>
    Object.values(block.cells[key]).some(isFilledCell)
  );
  return block.lines.flatMap(line => {
    const keysOnLine = usedKeys.filter(key => isFilledCell(block.cells[key][line.id]));
    if (!keysOnLine.length) return [];
    const texts = [
      ...new Set(
        keysOnLine.flatMap(key => {
          const shown = wellLine(block, key, line, calculation);
          return shown ? [wellLineText(shown)] : [];
        })
      ),
    ];
    const isOnEveryWell = keysOnLine.length === usedKeys.length && texts.length === 1;
    const autoRole: ShownRole = line === colorLine ? 'color' : isOnEveryWell ? 'caption' : 'band';
    return [{ line, role: line.role === 'auto' ? autoRole : line.role, texts }];
  });
}

export const plateCaptions = (layers: readonly LineLayer[]): string[] =>
  layers.flatMap(({ role, texts }) => {
    const text = texts.filter(Boolean).join(', ');
    return role === 'caption' && text ? [text] : [];
  });

export type BandPlace = 'ring' | 'tag' | 'top' | 'left';

interface BandCell {
  row: number;
  col: number;
}

export interface BandCluster {
  cells: BandCell[];
  top: number;
  bottom: number;
  left: number;
  right: number;
  place: BandPlace;
}

export interface PlateBand {
  text: string;
  color: string;
  clusters: BandCluster[];
}

export interface DoseHeaders {
  axis: 'col' | 'row';
  unit: string;
  labels: ReadonlyMap<number, { text: string; short: string }>;
}

const BAND_COLORS = ['#f0b35b', '#e8875a', '#6fbf73', '#c9ccd3'] as const;
const RING_MOST_WELLS = 2;
const FIRST_NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;

export function headerNumber(text: string): string {
  const number = parseFloat(FIRST_NUMBER.exec(text)?.[0] ?? '');
  if (Number.isNaN(number)) return text;
  if (Math.abs(number) >= 100) return String(Math.round(number));
  const short = String(Number(number.toPrecision(2)));
  return short.startsWith('0.') ? short.slice(1) : short;
}

function clustersOf(cells: BandCell[]): Array<Omit<BandCluster, 'place'>> {
  const left = new Map(cells.map(cell => [`${cell.row},${cell.col}`, cell]));
  const clusters: Array<Omit<BandCluster, 'place'>> = [];
  for (const start of cells) {
    if (!left.delete(`${start.row},${start.col}`)) continue;
    const found: BandCell[] = [];
    const queue = [start];
    while (queue.length) {
      const cell = queue.pop() as BandCell;
      found.push(cell);
      for (const [rowStep, colStep] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const id = `${cell.row + rowStep},${cell.col + colStep}`;
        const next = left.get(id);
        if (next && left.delete(id)) queue.push(next);
      }
    }
    const rows = found.map(cell => cell.row);
    const cols = found.map(cell => cell.col);
    clusters.push({
      cells: found,
      top: Math.min(...rows),
      bottom: Math.max(...rows),
      left: Math.min(...cols),
      right: Math.max(...cols),
    });
  }
  return clusters;
}

export function plateBands(
  block: VesselMapBlock,
  sheet: VesselSheet,
  layers: readonly LineLayer[],
  calculation: BoardCalculation
): PlateBand[] {
  const usedSpots = sheet.spots.filter(spot =>
    Object.values(block.cells[spot.key] ?? {}).some(isFilledCell)
  );
  if (!usedSpots.length) return [];
  const usedTop = Math.min(...usedSpots.map(spot => spot.row));
  const usedBottom = Math.max(...usedSpots.map(spot => spot.row));
  const bands: PlateBand[] = [];
  for (const { line } of layers.filter(layer => layer.role === 'band')) {
    const byText = new Map<string, BandCell[]>();
    for (const spot of usedSpots) {
      const shown = wellLine(block, spot.key, line, calculation);
      const text = shown && wellLineText(shown);
      if (text) byText.set(text, [...(byText.get(text) ?? []), spot]);
    }
    for (const [text, cells] of byText) {
      const clusters = clustersOf(cells).map((cluster): BandCluster => {
        const area = (cluster.bottom - cluster.top + 1) * (cluster.right - cluster.left + 1);
        const spansUsedRows = cluster.top === usedTop && cluster.bottom === usedBottom;
        const place: BandPlace =
          cluster.cells.length <= RING_MOST_WELLS
            ? 'ring'
            : cluster.cells.length !== area
              ? 'tag'
              : spansUsedRows
                ? 'top'
                : 'left';
        return { ...cluster, place };
      });
      bands.push({ text, color: BAND_COLORS[bands.length % BAND_COLORS.length], clusters });
    }
  }
  return bands;
}

export function doseHeaders(
  block: VesselMapBlock,
  sheet: VesselSheet,
  colorLine: PlateLine | undefined,
  calculation: BoardCalculation
): DoseHeaders | undefined {
  if (!colorLine || !sheet.isPlate) return undefined;
  for (const axis of ['col', 'row'] as const) {
    const amountsAt = new Map<number, Set<string>>();
    for (const spot of sheet.spots) {
      const amount = wellLine(block, spot.key, colorLine, calculation)?.amount;
      if (!amount) continue;
      const index = axis === 'col' ? spot.col : spot.row;
      amountsAt.set(index, (amountsAt.get(index) ?? new Set()).add(amount));
    }
    if (amountsAt.size < 2 || ![...amountsAt.values()].every(amounts => amounts.size === 1))
      continue;
    const texts = new Map([...amountsAt].map(([index, amounts]) => [index, [...amounts][0]]));
    const units = new Set([...texts.values()].map(text => text.replace(FIRST_NUMBER, '').trim()));
    const unit = units.size === 1 ? [...units][0] : '';
    return {
      axis,
      unit,
      labels: new Map(
        [...texts].map(([index, text]) => [
          index,
          { text, short: unit ? headerNumber(text) : text },
        ])
      ),
    };
  }
  return undefined;
}
