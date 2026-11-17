import {
  UNIT_REGISTRY,
  lineValueOf,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { formatNumber, PAIR_NOTATION, readNumber, readPair } from '../formulas/quantities';

import { wellAmount } from './plateSeries';

import type { BoardCalculation } from '../formulas/boardCalculation';

const isCellCountUnit = (unit: string) =>
  UNIT_REGISTRY.some(entry => entry.id === unit && entry.kind === 'cell-count');

function typedCount(
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): number | undefined {
  const point = wellAmount(block, key, line, calculation);
  return point && isCellCountUnit(point.unit) ? readNumber(point.amount) : undefined;
}

export function ratioPartner(
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): PlateLine | undefined {
  const chosen = block.lines.find(other => other.id === line.ratioTo && other.id !== line.id);
  if (chosen) return chosen;
  const counted = block.lines.filter(
    other => other.id !== line.id && typedCount(block, key, other, calculation) !== undefined
  );
  return counted.length === 1 ? counted[0] : undefined;
}

export const isRatioAt = (
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): boolean => wellAmount(block, key, line, calculation)?.unit === PAIR_NOTATION;

export function cellCount(
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): number | undefined {
  const point = wellAmount(block, key, line, calculation);
  if (point?.unit !== PAIR_NOTATION) return typedCount(block, key, line, calculation);
  const ratio = readPair(point.amount);
  const partner = ratioPartner(block, key, line, calculation);
  const partnerCount = partner && typedCount(block, key, partner, calculation);
  return ratio !== undefined && partnerCount !== undefined ? ratio * partnerCount : undefined;
}

export function partnerName(block: VesselMapBlock, key: string, partner: PlateLine): string {
  const text = lineValueOf(partner, block.cells[key]?.[partner.id])?.text.trim();
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
  block: VesselMapBlock,
  keys: readonly string[],
  line: PlateLine,
  calculation: BoardCalculation
): RatioRow | undefined {
  const [firstKey] = keys;
  if (!firstKey || !keys.some(key => isRatioAt(block, key, line, calculation))) return undefined;
  const auto = ratioPartner(block, firstKey, { ...line, ratioTo: undefined }, calculation);
  const counts = keys.map(key => cellCount(block, key, line, calculation));
  const known = [...new Set(counts.filter(count => count !== undefined))];
  const workedOut =
    known.length === 1 && counts.every(count => count !== undefined)
      ? `= ${formatNumber(known[0])} cells`
      : known.length
        ? 'cells differ by well'
        : '';
  return {
    choices: block.lines
      .filter(other => other.id !== line.id && keys.some(key => block.cells[key]?.[other.id]))
      .map(other => ({ lineId: other.id, label: partnerName(block, firstKey, other) })),
    chosenId: block.lines.some(other => other.id === line.ratioTo) ? (line.ratioTo ?? '') : '',
    autoLabel: auto && partnerName(block, firstKey, auto),
    workedOut,
  };
}
