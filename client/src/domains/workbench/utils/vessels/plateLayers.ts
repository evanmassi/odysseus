import {
  bandColorOf,
  isFilledCell,
  lineValueOf,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

type LineValue = PlateLine['values'][number];

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
  valueId: string | undefined;
  wellsInMap: number;
  clusters: BandCluster[];
}

const RING_MOST_WELLS = 2;

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
    const byText = new Map<string, { cells: BandCell[]; value: LineValue | undefined }>();
    for (const spot of usedSpots) {
      const shown = wellLine(block, spot.key, line, calculation);
      const text = shown && wellLineText(shown);
      if (!text) continue;
      const group = byText.get(text) ?? {
        cells: [],
        value: lineValueOf(line, block.cells[spot.key]?.[line.id]),
      };
      group.cells.push(spot);
      byText.set(text, group);
    }
    const wellsInMap = new Map<string, number>();
    for (const key of Object.keys(block.cells)) {
      const shown = wellLine(block, key, line, calculation);
      const text = shown && wellLineText(shown);
      if (text) wellsInMap.set(text, (wellsInMap.get(text) ?? 0) + 1);
    }
    for (const [text, { cells, value }] of byText) {
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
      bands.push({
        text,
        color: bandColorOf(block, value),
        valueId: value?.id,
        wellsInMap: wellsInMap.get(text) ?? cells.length,
        clusters,
      });
    }
  }
  return bands;
}
