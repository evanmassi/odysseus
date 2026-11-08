import { pluralizeUnit } from './pluralizeUnit';

export const INVENTORY_UNIT_KINDS = [
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

const MEASUREMENT_UNIT_KINDS = [
  'cell-count',
  'molar-mass',
  'time',
  'temperature',
  'g-force',
  'rotor-speed',
] as const;

export type UnitKind =
  | (typeof INVENTORY_UNIT_KINDS)[number]
  | (typeof MEASUREMENT_UNIT_KINDS)[number];

export type UnitDimension = Readonly<Partial<Record<BaseDimension, number>>>;

type BaseDimension =
  | 'volume'
  | 'mass'
  | 'amount'
  | 'count'
  | 'time'
  | 'temperature'
  | 'g-force'
  | 'rotor-speed';

export interface UnitRegistryEntry {
  id: string;
  label: string;
  kind: UnitKind;
  factor?: number;
}

interface UnitScale {
  factor: number;
  dimension: UnitDimension;
}

const KIND_DIMENSIONS: Partial<Record<UnitKind, UnitDimension>> = {
  mass: { mass: 1 },
  volume: { volume: 1 },
  molarity: { amount: 1, volume: -1 },
  'mass-conc': { mass: 1, volume: -1 },
  'count-conc': { count: 1, volume: -1 },
  percent: {},
  fold: {},
  'cell-count': { count: 1 },
  'molar-mass': { mass: 1, amount: -1 },
  time: { time: 1 },
  temperature: { temperature: 1 },
  'g-force': { 'g-force': 1 },
  'rotor-speed': { 'rotor-speed': 1 },
};

export const CELL_CONCENTRATION_UNITS = ['c/v', 'c/mL'] as const;

export const UNIT_REGISTRY: readonly UnitRegistryEntry[] = [
  { id: 'M', label: 'M', kind: 'molarity', factor: 1 },
  { id: 'mM', label: 'mM', kind: 'molarity', factor: 1e-3 },
  { id: 'µM', label: 'µM', kind: 'molarity', factor: 1e-6 },
  { id: 'nM', label: 'nM', kind: 'molarity', factor: 1e-9 },
  { id: 'pM', label: 'pM', kind: 'molarity', factor: 1e-12 },
  { id: 'g/L', label: 'g/L', kind: 'mass-conc', factor: 1 },
  { id: 'mg/mL', label: 'mg/mL', kind: 'mass-conc', factor: 1 },
  { id: 'µg/mL', label: 'µg/mL', kind: 'mass-conc', factor: 1e-3 },
  { id: 'ng/mL', label: 'ng/mL', kind: 'mass-conc', factor: 1e-6 },
  { id: 'pg/mL', label: 'pg/mL', kind: 'mass-conc', factor: 1e-9 },
  { id: 'µg/µL', label: 'µg/µL', kind: 'mass-conc', factor: 1 },
  { id: 'ng/µL', label: 'ng/µL', kind: 'mass-conc', factor: 1e-3 },
  { id: 'beads/mL', label: 'beads/mL', kind: 'count-conc', factor: 1e3 },
  { id: 'cells/mL', label: 'cells/mL', kind: 'count-conc', factor: 1e3 },
  { id: 'particles/mL', label: 'particles/mL', kind: 'count-conc', factor: 1e3 },
  { id: 'IU/mL', label: 'IU/mL', kind: 'count-conc' },
  { id: '%', label: '%', kind: 'percent', factor: 0.01 },
  { id: 'U/mL', label: 'U/mL', kind: 'activity-conc' },
  { id: 'X', label: 'X', kind: 'fold', factor: 1 },
  { id: 'g', label: 'g', kind: 'mass', factor: 1 },
  { id: 'mg', label: 'mg', kind: 'mass', factor: 1e-3 },
  { id: 'µg', label: 'µg', kind: 'mass', factor: 1e-6 },
  { id: 'ng', label: 'ng', kind: 'mass', factor: 1e-9 },
  { id: 'pg', label: 'pg', kind: 'mass', factor: 1e-12 },
  { id: 'kg', label: 'kg', kind: 'mass', factor: 1e3 },
  { id: 'L', label: 'L', kind: 'volume', factor: 1 },
  { id: 'mL', label: 'mL', kind: 'volume', factor: 1e-3 },
  { id: 'µL', label: 'µL', kind: 'volume', factor: 1e-6 },
  { id: 'nL', label: 'nL', kind: 'volume', factor: 1e-9 },
  { id: 'U', label: 'U', kind: 'activity' },
  { id: 'vial', label: 'vial', kind: 'count' },
  { id: 'tube', label: 'tube', kind: 'count' },
  { id: 'each', label: 'each', kind: 'count' },
  { id: 'box', label: 'box', kind: 'count' },
  { id: 'pack', label: 'pack', kind: 'count' },
  { id: 'case', label: 'case', kind: 'count' },
  ...CELL_CONCENTRATION_UNITS.map(id => ({ id, label: id, kind: 'cell-conc' as const })),
  { id: 'cells', label: 'cells', kind: 'cell-count', factor: 1 },
  { id: 'g/mol', label: 'g/mol', kind: 'molar-mass', factor: 1 },
  { id: 'kDa', label: 'kDa', kind: 'molar-mass', factor: 1e3 },
  { id: 's', label: 's', kind: 'time', factor: 1 },
  { id: 'min', label: 'min', kind: 'time', factor: 60 },
  { id: 'h', label: 'h', kind: 'time', factor: 3600 },
  { id: '°C', label: '°C', kind: 'temperature', factor: 1 },
  { id: '× g', label: '× g', kind: 'g-force', factor: 1 },
  { id: 'rpm', label: 'rpm', kind: 'rotor-speed', factor: 1 },
];

const UNIT_BY_ID = new Map(UNIT_REGISTRY.map(unit => [unit.id, unit]));

export function unitScale(unitId: string): UnitScale | undefined {
  const unit = UNIT_BY_ID.get(unitId);
  const dimension = unit && KIND_DIMENSIONS[unit.kind];
  if (unit?.factor === undefined || !dimension) return undefined;
  return { factor: unit.factor, dimension };
}

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

export function formatQuantity(value: number, unitId: string): string {
  const unit = UNIT_BY_ID.get(unitId);
  const label = unit?.label ?? unitId;
  const formatted = unit?.kind === 'cell-conc' ? formatScientific(value) : formatDecimal(value);
  return `${formatted} ${unit?.kind === 'count' ? pluralizeUnit(label, value) : label}`;
}
