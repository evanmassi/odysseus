/**
 * Unit Registry
 *
 * Dimension-tagged catalog of measurement units for reagent concentration and
 * amount fields, plus tube cell concentration. Each unit carries its `kind`
 * (dimension) so a field can offer a filtered subset and values format per
 * dimension: cell counts render in scientific notation, everything else plain.
 */

import { pluralizeUnit } from './pluralizeUnit';

export const UNIT_KINDS = [
  'mass',
  'volume',
  'molarity',
  'mass-conc',
  'count-conc',
  'percent',
  'activity',
  'activity-conc',
  'fold',
  'cell-conc',
  'count',
] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

export interface UnitRegistryEntry {
  id: string;
  label: string;
  kind: UnitKind;
}

/** Tube cell-concentration units, kept as a literal tuple so tubes derive a typed enum. */
export const CELL_CONCENTRATION_UNITS = ['c/v', 'c/mL'] as const;

export const UNIT_REGISTRY: readonly UnitRegistryEntry[] = [
  // Concentration — molarity
  { id: 'M', label: 'M', kind: 'molarity' },
  { id: 'mM', label: 'mM', kind: 'molarity' },
  { id: 'µM', label: 'µM', kind: 'molarity' },
  { id: 'nM', label: 'nM', kind: 'molarity' },
  { id: 'pM', label: 'pM', kind: 'molarity' },
  // Concentration — mass per volume
  { id: 'g/L', label: 'g/L', kind: 'mass-conc' },
  { id: 'mg/mL', label: 'mg/mL', kind: 'mass-conc' },
  { id: 'µg/mL', label: 'µg/mL', kind: 'mass-conc' },
  { id: 'µg/µL', label: 'µg/µL', kind: 'mass-conc' },
  { id: 'ng/µL', label: 'ng/µL', kind: 'mass-conc' },
  // Concentration — count per volume
  { id: 'beads/mL', label: 'beads/mL', kind: 'count-conc' },
  { id: 'cells/mL', label: 'cells/mL', kind: 'count-conc' },
  { id: 'particles/mL', label: 'particles/mL', kind: 'count-conc' },
  { id: 'IU/mL', label: 'IU/mL', kind: 'count-conc' },
  // Concentration — percent / activity / fold
  { id: '%', label: '%', kind: 'percent' },
  { id: 'U/mL', label: 'U/mL', kind: 'activity-conc' },
  { id: 'X', label: 'X', kind: 'fold' },
  // Amount — mass
  { id: 'g', label: 'g', kind: 'mass' },
  { id: 'mg', label: 'mg', kind: 'mass' },
  { id: 'µg', label: 'µg', kind: 'mass' },
  { id: 'ng', label: 'ng', kind: 'mass' },
  { id: 'kg', label: 'kg', kind: 'mass' },
  // Amount — volume
  { id: 'L', label: 'L', kind: 'volume' },
  { id: 'mL', label: 'mL', kind: 'volume' },
  { id: 'µL', label: 'µL', kind: 'volume' },
  { id: 'nL', label: 'nL', kind: 'volume' },
  // Amount — activity / count. The countable kind doubles as the packaging vocabulary,
  // so a pack unit and a stock unit come from the same list.
  { id: 'U', label: 'U', kind: 'activity' },
  { id: 'vial', label: 'vial', kind: 'count' },
  { id: 'tube', label: 'tube', kind: 'count' },
  { id: 'each', label: 'each', kind: 'count' },
  { id: 'box', label: 'box', kind: 'count' },
  { id: 'pack', label: 'pack', kind: 'count' },
  { id: 'case', label: 'case', kind: 'count' },
  // Tube cell concentration
  ...CELL_CONCENTRATION_UNITS.map(id => ({ id, label: id, kind: 'cell-conc' as const })),
];

const UNIT_BY_ID = new Map(UNIT_REGISTRY.map(unit => [unit.id, unit]));

/**
 * Cell counts in scientific notation with a 2-decimal mantissa: 5000000 → "5.0E+6".
 * Empty string for an absent value, "0" for zero.
 */
export function formatScientific(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  const exponentFormatted = exponent >= 0 ? `+${exponent}` : `${exponent}`;
  return `${mantissa.toFixed(2)}E${exponentFormatted}`;
}

function formatDecimal(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 10 });
}

/**
 * A quantity with its unit label: `1.5 mM`, `500 g`, `5 vials`. Cell-concentration units
 * render in scientific notation; every other dimension renders as a plain decimal. Only
 * countable units pluralize — a dimension is a measure, so `5 mL` never becomes `5 mLs`.
 */
export function formatQuantity(value: number, unitId: string): string {
  const unit = UNIT_BY_ID.get(unitId);
  const label = unit?.label ?? unitId;
  const formatted = unit?.kind === 'cell-conc' ? formatScientific(value) : formatDecimal(value);
  return `${formatted} ${unit?.kind === 'count' ? pluralizeUnit(label, value) : label}`;
}
