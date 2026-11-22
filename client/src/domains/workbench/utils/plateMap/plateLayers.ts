import {
  indicatorColorOf,
  isFilledEntry,
  lineValueOf,
  type PlateLine,
  type PlateMapCard,
} from '@odysseus/shared-schemas';

import { seriesProgress, wellLine, wellLineText, type WellColor } from './wellContents';

import type { PlateMapSheet } from './plateMapTabs';
import type { SolvedBoard } from '../formulas/boardCalculation';

export type ShownRole = Exclude<PlateLine['role'], 'auto'>;

export interface LineLayer {
  line: PlateLine;
  role: ShownRole;
  texts: string[];
}

const SOLID_STRIPE = 100;
const STRIPE_FADE = 70;

export function lineLayers(
  card: PlateMapCard,
  colorLine: PlateLine | undefined,
  board: SolvedBoard
): LineLayer[] {
  const usedKeys = Object.keys(card.samples).filter(key =>
    Object.values(card.samples[key]).some(isFilledEntry)
  );
  return card.lines.flatMap(line => {
    const keysOnLine = usedKeys.filter(key => isFilledEntry(card.samples[key][line.id]));
    if (!keysOnLine.length) return [];
    const texts = [
      ...new Set(
        keysOnLine.flatMap(key => {
          const shown = wellLine(card, key, line, board);
          return shown ? [wellLineText(shown)] : [];
        })
      ),
    ];
    const isOnEveryWell = keysOnLine.length === usedKeys.length && texts.length === 1;
    const autoRole: ShownRole = line === colorLine ? 'fill' : isOnEveryWell ? 'caption' : 'band';
    return [{ line, role: line.role === 'auto' ? autoRole : line.role, texts }];
  });
}

export function wellStripes(
  card: PlateMapCard,
  key: string,
  layers: readonly LineLayer[]
): Array<WellColor | undefined> {
  const slots = layers
    .filter(layer => layer.role === 'stripe')
    .map(({ line }) => {
      const value = lineValueOf(line, card.samples[key]?.[line.id]);
      if (!value) return undefined;
      const progress = seriesProgress(card, key, line);
      const tint =
        progress === undefined ? SOLID_STRIPE : Math.round(SOLID_STRIPE - progress * STRIPE_FADE);
      return { color: indicatorColorOf(card, value), tint };
    });
  return slots.some(Boolean) ? slots : [];
}

export const plateCaptions = (layers: readonly LineLayer[]): string[] =>
  layers.flatMap(({ role, texts }) => {
    const text = texts.filter(Boolean).join(', ');
    return role === 'caption' && text ? [text] : [];
  });

export type IndicatorPlacement = 'wellBorder' | 'corner' | 'inWell' | 'bracketTop' | 'bracketLeft';

export type IndicatorKind = 'band' | 'stripe' | 'fill';

export function indicatorKindOf(role: ShownRole): IndicatorKind | undefined {
  if (role === 'fill') return 'fill';
  if (role === 'stripe') return 'stripe';
  return role === 'band' || role === 'tag' ? 'band' : undefined;
}

interface IndicatorCell {
  row: number;
  col: number;
}

export interface IndicatorCluster {
  cells: IndicatorCell[];
  top: number;
  bottom: number;
  left: number;
  right: number;
  place: IndicatorPlacement;
}

export interface PlateIndicator {
  lineId: string;
  kind: IndicatorKind;
  showsOutline: boolean;
  showsBracket: boolean;
  label: string;
  text: string;
  color: string;
  valueId: string | undefined;
  wellsInMap: number;
  clusters: IndicatorCluster[];
}

const WELL_BORDER_MOST_WELLS = 2;

function clustersOf(cells: IndicatorCell[]): Array<Omit<IndicatorCluster, 'place'>> {
  const left = new Map(cells.map(cell => [`${cell.row},${cell.col}`, cell]));
  const clusters: Array<Omit<IndicatorCluster, 'place'>> = [];
  for (const start of cells) {
    if (!left.delete(`${start.row},${start.col}`)) continue;
    const found: IndicatorCell[] = [];
    const queue = [start];
    while (queue.length) {
      const cell = queue.pop() as IndicatorCell;
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

function amountSummary(
  card: PlateMapCard,
  line: PlateLine,
  keys: readonly string[],
  board: SolvedBoard
): string {
  const readableAt = (key: string) => wellLine(card, key, line, board)?.readable ?? '';
  const runs = new Map<string, string[]>();
  const plain = new Set<string>();
  for (const key of keys) {
    const seriesId = card.samples[key]?.[line.id]?.seriesId;
    if (seriesId !== undefined) runs.set(seriesId, [...(runs.get(seriesId) ?? []), key]);
    else if (readableAt(key)) plain.add(readableAt(key));
  }
  const ranges = [...runs.values()].map(run => {
    const byStep = [...run].sort(
      (a, b) =>
        (card.samples[a][line.id].seriesPoint ?? 0) - (card.samples[b][line.id].seriesPoint ?? 0)
    );
    const [first, last] = [readableAt(byStep[0]), readableAt(byStep[byStep.length - 1])];
    return first === last ? first : `${first} → ${last}`;
  });
  return [...ranges, ...plain].join(', ');
}

function placeClusters(
  cells: IndicatorCell[],
  usedTop: number,
  usedBottom: number
): IndicatorCluster[] {
  return clustersOf(cells).map((cluster): IndicatorCluster => {
    const area = (cluster.bottom - cluster.top + 1) * (cluster.right - cluster.left + 1);
    const spansUsedRows = cluster.top === usedTop && cluster.bottom === usedBottom;
    const place: IndicatorPlacement =
      cluster.cells.length <= WELL_BORDER_MOST_WELLS
        ? 'wellBorder'
        : cluster.cells.length !== area
          ? 'corner'
          : spansUsedRows
            ? 'bracketTop'
            : 'bracketLeft';
    return { ...cluster, place };
  });
}

const isScatteredPlace = (place: IndicatorPlacement) =>
  place === 'wellBorder' || place === 'corner';

export function plateIndicators(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  layers: readonly LineLayer[],
  board: SolvedBoard,
  printsInWells: boolean
): PlateIndicator[] {
  const usedPositions = sheet.positions.filter(position =>
    Object.values(card.samples[position.key] ?? {}).some(isFilledEntry)
  );
  if (!usedPositions.length) return [];
  const usedTop = Math.min(...usedPositions.map(position => position.row));
  const usedBottom = Math.max(...usedPositions.map(position => position.row));
  const indicators: PlateIndicator[] = [];
  for (const { line, role } of layers) {
    const isLabeledFill = role === 'fill' && !printsInWells;
    if (role !== 'band' && role !== 'stripe' && role !== 'tag' && !isLabeledFill) continue;
    const groupOf = (key: string) => {
      const shown = wellLine(card, key, line, board);
      if (!shown || !wellLineText(shown) || (isLabeledFill && shown.readable)) return undefined;
      const entry = card.samples[key][line.id];
      const amountKey = entry.seriesId === undefined ? shown.readable : `series:${entry.seriesId}`;
      return { key: `${entry.valueId ?? ''}|${amountKey}`, label: shown.label };
    };
    const groups = new Map<string, { label: string; mapKeys: string[]; cells: IndicatorCell[] }>();
    for (const key of Object.keys(card.samples)) {
      const group = groupOf(key);
      if (!group) continue;
      const entry = groups.get(group.key) ?? { label: group.label, mapKeys: [], cells: [] };
      entry.mapKeys.push(key);
      groups.set(group.key, entry);
    }
    for (const position of usedPositions) {
      const group = groupOf(position.key);
      if (group) groups.get(group.key)?.cells.push(position);
    }
    const shownGroups = [...groups.values()]
      .filter(group => group.cells.length)
      .map(group => ({
        ...group,
        amount: amountSummary(card, line, group.mapKeys, board),
        clusters: placeClusters(group.cells, usedTop, usedBottom),
      }));
    const isScattered =
      role === 'tag' ||
      (!isLabeledFill &&
        shownGroups.every(group =>
          group.clusters.every(cluster => isScatteredPlace(cluster.place))
        ));
    const isAmountShared = new Set(shownGroups.map(group => group.amount)).size <= 1;
    const hidden = new Set(line.hiddenIndicators);
    for (const { label, amount, mapKeys, clusters } of shownGroups) {
      const value = lineValueOf(line, card.samples[mapKeys[0]][line.id]);
      indicators.push({
        lineId: line.id,
        kind: isLabeledFill ? 'fill' : role === 'stripe' ? 'stripe' : 'band',
        showsOutline: !isLabeledFill && !hidden.has('outline'),
        showsBracket: !hidden.has('bracket'),
        label,
        text: isAmountShared ? label || amount : [label, amount].filter(Boolean).join(' · '),
        color: isLabeledFill
          ? (value?.color ?? indicatorColorOf(card, value))
          : indicatorColorOf(card, value),
        valueId: value?.id,
        wellsInMap: mapKeys.length,
        clusters: clusters.map(cluster => ({
          ...cluster,
          place: isScattered ? (printsInWells ? 'inWell' : 'wellBorder') : cluster.place,
        })),
      });
    }
  }
  return indicators;
}
