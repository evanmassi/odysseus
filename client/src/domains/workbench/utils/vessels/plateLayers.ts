import {
  bandColorOf,
  isFilledCell,
  lineValueOf,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { seriesProgress, wellLine, wellLineText, type WellColor } from './wellContents';

import type { VesselSheet } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';

export type ShownRole = Exclude<PlateLine['role'], 'auto'>;

export interface LineLayer {
  line: PlateLine;
  role: ShownRole;
  texts: string[];
}

const SOLID_STRIPE = 100;
const STRIPE_FADE = 70;

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

export function wellStripes(
  block: VesselMapBlock,
  key: string,
  layers: readonly LineLayer[]
): Array<WellColor | undefined> {
  const slots = layers
    .filter(layer => layer.role === 'stripe')
    .map(({ line }) => {
      const value = lineValueOf(line, block.cells[key]?.[line.id]);
      if (!value) return undefined;
      const progress = seriesProgress(block, key, line);
      const tint =
        progress === undefined ? SOLID_STRIPE : Math.round(SOLID_STRIPE - progress * STRIPE_FADE);
      return { color: bandColorOf(block, value), tint };
    });
  return slots.some(Boolean) ? slots : [];
}

export const plateCaptions = (layers: readonly LineLayer[]): string[] =>
  layers.flatMap(({ role, texts }) => {
    const text = texts.filter(Boolean).join(', ');
    return role === 'caption' && text ? [text] : [];
  });

export type BandPlace = 'ring' | 'tag' | 'well' | 'top' | 'left';

export type BandKind = 'band' | 'stripe' | 'fill';

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
  lineId: string;
  kind: BandKind;
  showsOutline: boolean;
  showsBracket: boolean;
  label: string;
  amount: string;
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

export function amountSummary(
  block: VesselMapBlock,
  line: PlateLine,
  keys: readonly string[],
  calculation: BoardCalculation
): string {
  const readableAt = (key: string) => wellLine(block, key, line, calculation)?.readable ?? '';
  const runs = new Map<string, string[]>();
  const plain = new Set<string>();
  for (const key of keys) {
    const seriesId = block.cells[key]?.[line.id]?.seriesId;
    if (seriesId !== undefined) runs.set(seriesId, [...(runs.get(seriesId) ?? []), key]);
    else if (readableAt(key)) plain.add(readableAt(key));
  }
  const ranges = [...runs.values()].map(run => {
    const byStep = [...run].sort(
      (a, b) =>
        (block.cells[a][line.id].seriesStep ?? 0) - (block.cells[b][line.id].seriesStep ?? 0)
    );
    const [first, last] = [readableAt(byStep[0]), readableAt(byStep[byStep.length - 1])];
    return first === last ? first : `${first} → ${last}`;
  });
  return [...ranges, ...plain].join(', ');
}

export function fillAmounts(
  block: VesselMapBlock,
  colorLine: PlateLine | undefined,
  calculation: BoardCalculation
): ReadonlyMap<string, string> {
  if (!colorLine) return new Map();
  const keysByValue = new Map<string, string[]>();
  for (const key of Object.keys(block.cells)) {
    const valueId = block.cells[key][colorLine.id]?.valueId;
    if (valueId) keysByValue.set(valueId, [...(keysByValue.get(valueId) ?? []), key]);
  }
  return new Map(
    [...keysByValue].map(([valueId, keys]) => [
      valueId,
      amountSummary(block, colorLine, keys, calculation),
    ])
  );
}

function placeClusters(cells: BandCell[], usedTop: number, usedBottom: number): BandCluster[] {
  return clustersOf(cells).map((cluster): BandCluster => {
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
}

const isScatteredPlace = (place: BandPlace) => place === 'ring' || place === 'tag';

export function plateBands(
  block: VesselMapBlock,
  sheet: VesselSheet,
  layers: readonly LineLayer[],
  calculation: BoardCalculation,
  printsInWells: boolean
): PlateBand[] {
  const usedSpots = sheet.spots.filter(spot =>
    Object.values(block.cells[spot.key] ?? {}).some(isFilledCell)
  );
  if (!usedSpots.length) return [];
  const usedTop = Math.min(...usedSpots.map(spot => spot.row));
  const usedBottom = Math.max(...usedSpots.map(spot => spot.row));
  const bands: PlateBand[] = [];
  for (const { line, role } of layers) {
    const isLabeledFill = role === 'color' && !printsInWells;
    if (role !== 'band' && role !== 'stripe' && role !== 'tag' && !isLabeledFill) continue;
    const groupOf = (key: string) => {
      const shown = wellLine(block, key, line, calculation);
      if (!shown || !wellLineText(shown) || (isLabeledFill && shown.readable)) return undefined;
      const cell = block.cells[key][line.id];
      const amountKey = cell.seriesId === undefined ? shown.readable : `series:${cell.seriesId}`;
      return { key: `${cell.valueId ?? ''}|${amountKey}`, label: shown.label };
    };
    const groups = new Map<string, { label: string; mapKeys: string[]; cells: BandCell[] }>();
    for (const key of Object.keys(block.cells)) {
      const group = groupOf(key);
      if (!group) continue;
      const entry = groups.get(group.key) ?? { label: group.label, mapKeys: [], cells: [] };
      entry.mapKeys.push(key);
      groups.set(group.key, entry);
    }
    for (const spot of usedSpots) {
      const group = groupOf(spot.key);
      if (group) groups.get(group.key)?.cells.push(spot);
    }
    const shownGroups = [...groups.values()]
      .filter(group => group.cells.length)
      .map(group => ({
        ...group,
        amount: amountSummary(block, line, group.mapKeys, calculation),
        clusters: placeClusters(group.cells, usedTop, usedBottom),
      }));
    const isScattered =
      role === 'tag' ||
      (!isLabeledFill &&
        shownGroups.every(group =>
          group.clusters.every(cluster => isScatteredPlace(cluster.place))
        ));
    const isAmountShared = new Set(shownGroups.map(group => group.amount)).size <= 1;
    const hidden = new Set(line.hiddenMarks);
    for (const { label, amount, mapKeys, clusters } of shownGroups) {
      const value = lineValueOf(line, block.cells[mapKeys[0]][line.id]);
      bands.push({
        lineId: line.id,
        kind: isLabeledFill ? 'fill' : role === 'stripe' ? 'stripe' : 'band',
        showsOutline: !isLabeledFill && !hidden.has('outline'),
        showsBracket: !hidden.has('bracket'),
        label,
        amount,
        text: isAmountShared ? label || amount : [label, amount].filter(Boolean).join(' · '),
        color: isLabeledFill
          ? (value?.color ?? bandColorOf(block, value))
          : bandColorOf(block, value),
        valueId: value?.id,
        wellsInMap: mapKeys.length,
        clusters: clusters.map(cluster => ({
          ...cluster,
          place: isScattered ? (printsInWells ? 'well' : 'ring') : cluster.place,
        })),
      });
    }
  }
  return bands;
}
