import {
  UNIT_REGISTRY,
  parseNumberInput,
  unitScale,
  type UnitDimension,
} from '@odysseus/shared-schemas';

import { unitKindLabel } from '@shared/utils/unitOptions';

export interface Quantity {
  magnitude: number;
  dimension: UnitDimension;
}

export type FormattedQuantity = { text: string } | { error: string };

export const AUTO_UNIT = 'auto';
export const RATIO_NOTATION = '1:N';
export const PAIR_NOTATION = 'N:N';
const FOLD_UNIT = 'X';
const NO_DIMENSION: UnitDimension = {};

const AUTO_DISPLAY_UNITS = [
  ['L', 'mL', 'µL', 'nL'],
  ['mg', 'µg', 'ng', 'pg'],
  ['mg/mL', 'µg/mL', 'ng/mL', 'pg/mL'],
  ['mM', 'µM', 'nM', 'pM'],
  ['h', 'min'],
  ['cells'],
  ['cells/mL'],
];

export function dimensionKey(dimension: UnitDimension): string {
  return Object.entries(dimension)
    .filter(([, power]) => power)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([base, power]) => `${base}:${power}`)
    .join('|');
}

export const isSameDimension = (a: UnitDimension, b: UnitDimension): boolean =>
  dimensionKey(a) === dimensionKey(b);

export function combineDimensions(a: UnitDimension, b: UnitDimension, sign: 1 | -1): UnitDimension {
  const combined: Record<string, number> = { ...a };
  for (const [base, power] of Object.entries(b))
    combined[base] = (combined[base] ?? 0) + sign * (power ?? 0);
  return Object.fromEntries(Object.entries(combined).filter(([, power]) => power));
}

const DIMENSION_WORDS = new Map<string, string>();
for (const unit of UNIT_REGISTRY) {
  const scale = unitScale(unit.id);
  const key = scale && dimensionKey(scale.dimension);
  if (key && !DIMENSION_WORDS.has(key))
    DIMENSION_WORDS.set(key, unitKindLabel(unit.kind).toLowerCase());
}

export function describeDimension(dimension: UnitDimension): string {
  const key = dimensionKey(dimension);
  if (!key) return 'plain number';
  return DIMENSION_WORDS.get(key) ?? `mixed unit (${key.replace(/\|/g, ' · ')})`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '?';
  const size = Math.abs(value);
  if (size === 0) return '0';
  if (size >= 1e5 || size < 1e-3)
    return value.toExponential(2).replace('e+', 'E+').replace('e-', 'E-');
  if (Number.isInteger(value)) return String(value);
  return String(parseFloat(value.toPrecision(3)));
}

export function readNumber(text: string): number | undefined {
  const parsed = parseNumberInput(text);
  return parsed.success ? parsed.value : undefined;
}

function readPair(text: string): number | undefined {
  const [first, second] = text.split(':').map(readNumber);
  return first !== undefined && second !== undefined && second > 0 ? first / second : undefined;
}

const scaleOf = (unit: string) => unitScale(unit) ?? { factor: 1, dimension: NO_DIMENSION };

export function quantityOf(value: string, unit: string): Quantity | undefined {
  if (unit === PAIR_NOTATION) {
    const ratio = readPair(value);
    return ratio === undefined ? undefined : { magnitude: ratio, dimension: NO_DIMENSION };
  }
  const number = readNumber(value);
  if (number === undefined) return undefined;
  if (unit === RATIO_NOTATION) {
    return number > 0 ? { magnitude: 1 / number, dimension: NO_DIMENSION } : undefined;
  }
  const { factor, dimension } = scaleOf(unit);
  return { magnitude: number * factor, dimension };
}

export function displayValue(value: string, unit: string): string {
  const text = value.trim();
  if (unit === RATIO_NOTATION) return `1:${text}`;
  if (unit === PAIR_NOTATION) return text.replace(/\s*:\s*/, ':');
  if (unit === FOLD_UNIT) return `${text}×`;
  return unit ? `${text} ${unit}` : text;
}

export function autoFormat(quantity: Quantity): string {
  const key = dimensionKey(quantity.dimension);
  const candidates = AUTO_DISPLAY_UNITS.find(
    units => dimensionKey(scaleOf(units[0]).dimension) === key
  );
  if (!candidates) {
    const number = formatNumber(quantity.magnitude);
    return key ? `${number} (${describeDimension(quantity.dimension)})` : number;
  }
  const size = Math.abs(quantity.magnitude);
  const unit =
    size === 0
      ? candidates[Math.min(1, candidates.length - 1)]
      : (candidates.find(id => size / scaleOf(id).factor >= 1) ??
        candidates[candidates.length - 1]);
  return `${formatNumber(quantity.magnitude / scaleOf(unit).factor)} ${unit}`;
}

const isNotation = (unit: string) => unit === RATIO_NOTATION || unit === PAIR_NOTATION;

export function formatQuantityIn(quantity: Quantity, unit: string): FormattedQuantity {
  if (!unit || unit === AUTO_UNIT) return { text: autoFormat(quantity) };
  const target = isNotation(unit) ? NO_DIMENSION : unitScale(unit)?.dimension;
  if (!target) return { error: `${unit} can't be calculated with` };
  if (!isSameDimension(target, quantity.dimension)) {
    return {
      error: `Works out to a ${describeDimension(quantity.dimension)} (${autoFormat(quantity)}), not ${unit}`,
    };
  }
  const { magnitude } = quantity;
  if (unit === RATIO_NOTATION) return { text: `1:${formatNumber(1 / magnitude)}` };
  if (unit === PAIR_NOTATION) {
    return {
      text: magnitude >= 1 ? `${formatNumber(magnitude)}:1` : `1:${formatNumber(1 / magnitude)}`,
    };
  }
  if (unit === FOLD_UNIT) return { text: `${formatNumber(magnitude)}×` };
  return { text: `${formatNumber(magnitude / scaleOf(unit).factor)} ${unit}` };
}

export const FORMULA_LITERAL_UNITS = UNIT_REGISTRY.filter(
  unit => unit.id !== FOLD_UNIT && !unit.id.startsWith('×') && unitScale(unit.id)
)
  .map(unit => unit.id)
  .sort((a, b) => b.length - a.length);
