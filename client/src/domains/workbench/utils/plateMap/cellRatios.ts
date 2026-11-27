import {
  UNIT_REGISTRY,
  lineValueOf,
  type PlateLine,
  type PlateMap,
} from '@odysseus/shared-schemas';

import { formatNumber, PAIR_NOTATION, readNumber, readPair } from '../formulas/quantities';
import { readTypedAmount } from '../units/textAmounts';

import { wellAmount } from './plateSeries';

import type { SolvedBoard } from '../formulas/boardCalculation';

const isCellCountUnit = (unit: string) =>
  UNIT_REGISTRY.some(entry => entry.id === unit && entry.kind === 'cell-count');

const STARTS_WITH_NUMBER = /^\s*[-+]?\.?\d/;

export const hasNamedSeriesTop = (plateMaps: readonly PlateMap[]): boolean =>
  plateMaps.some(plateMap =>
    Object.values(plateMap.series).some(
      series => 'top' in series && !STARTS_WITH_NUMBER.test(series.top)
    )
  );

function typedCount(
  card: PlateMap,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): number | undefined {
  const point = wellAmount(card, key, line, board);
  if (!point) return undefined;
  const typed = point.unit
    ? { value: point.amount, unit: point.unit }
    : readTypedAmount(point.amount);
  return typed && isCellCountUnit(typed.unit) ? readNumber(typed.value) : undefined;
}

export function ratioPartner(
  card: PlateMap,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): PlateLine | undefined {
  const chosen = card.lines.find(other => other.id === line.ratioTo && other.id !== line.id);
  if (chosen) return chosen;
  const counted = card.lines.filter(
    other => other.id !== line.id && typedCount(card, key, other, board) !== undefined
  );
  return counted.length === 1 ? counted[0] : undefined;
}

export const isRatioAt = (
  card: PlateMap,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): boolean => wellAmount(card, key, line, board)?.unit === PAIR_NOTATION;

export function cellCount(
  card: PlateMap,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): number | undefined {
  const point = wellAmount(card, key, line, board);
  if (point?.unit !== PAIR_NOTATION) return typedCount(card, key, line, board);
  const ratio = readPair(point.amount);
  const partner = ratioPartner(card, key, line, board);
  const partnerCount = partner && typedCount(card, key, partner, board);
  return ratio !== undefined && partnerCount !== undefined ? ratio * partnerCount : undefined;
}

export function partnerName(card: PlateMap, key: string, partner: PlateLine): string {
  const text = lineValueOf(partner, card.samples[key]?.[partner.id])?.text.trim();
  return [text, partner.name.trim()].find(Boolean) ?? 'the other cells';
}

export interface RatioChoice {
  lineId: string;
  label: string;
}

export interface RatioRow {
  choices: RatioChoice[];
  chosenId: string;
  autoLabel: string | undefined;
  workedOut: string;
}

export function ratioRow(
  card: PlateMap,
  keys: readonly string[],
  line: PlateLine,
  board: SolvedBoard
): RatioRow | undefined {
  const [firstKey] = keys;
  if (!firstKey || !keys.some(key => isRatioAt(card, key, line, board))) return undefined;
  const auto = ratioPartner(card, firstKey, { ...line, ratioTo: undefined }, board);
  const counts = keys.map(key => cellCount(card, key, line, board));
  const known = [...new Set(counts.filter(count => count !== undefined))];
  const workedOut =
    known.length === 1 && counts.every(count => count !== undefined)
      ? `= ${formatNumber(known[0])} cells`
      : known.length
        ? 'cells differ by well'
        : '';
  return {
    choices: card.lines
      .filter(other => other.id !== line.id && keys.some(key => card.samples[key]?.[other.id]))
      .map(other => ({ lineId: other.id, label: partnerName(card, firstKey, other) })),
    chosenId: card.lines.some(other => other.id === line.ratioTo) ? (line.ratioTo ?? '') : '',
    autoLabel: auto && partnerName(card, firstKey, auto),
    workedOut,
  };
}
