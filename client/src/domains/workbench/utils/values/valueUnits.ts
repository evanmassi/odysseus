import { UNIT_REGISTRY, unitScale, type UnitKind } from '@odysseus/shared-schemas';

import { unitKindLabel } from '@shared/utils/unitOptions';

import { AUTO_UNIT, PAIR_NOTATION, RATIO_NOTATION } from '../formulas/quantities';

import type { SelectOption } from '@shared/ui';

const NOTATION_GROUP = 'Number & ratio';

const NOTATION_LABELS: ReadonlyArray<[string, string]> = [
  ['', 'none'],
  ['%', '%'],
  ['X', 'fold ×'],
  [RATIO_NOTATION, 'dilution 1:N'],
  [PAIR_NOTATION, 'ratio N:N'],
];

const NOTATION_IDS = new Set(NOTATION_LABELS.map(([id]) => id));

const VALUE_UNIT_KINDS: readonly UnitKind[] = [
  'volume',
  'mass',
  'cell-count',
  'count-conc',
  'mass-conc',
  'molarity',
  'molar-mass',
  'time',
  'temperature',
  'g-force',
  'rotor-speed',
];

export const VALUE_UNIT_OPTIONS: readonly SelectOption[] = [
  ...NOTATION_LABELS.map(([value, label]) => ({ value, label, group: NOTATION_GROUP })),
  ...VALUE_UNIT_KINDS.flatMap(kind =>
    UNIT_REGISTRY.filter(
      unit => unit.kind === kind && unitScale(unit.id) && !NOTATION_IDS.has(unit.id)
    ).map(unit => ({ value: unit.id, label: unit.label, group: unitKindLabel(kind) }))
  ),
];

export const valueUnitLabel = (unit: string): string =>
  NOTATION_LABELS.find(([id]) => id === unit)?.[1] ?? unit;

export const unitChoices = (units: readonly string[]): SelectOption[] =>
  units.map(unit => ({ value: unit, label: valueUnitLabel(unit) }));

const FORMULA_EXCLUDED_UNITS = new Set(['', '°C']);

export const FORMULA_UNIT_OPTIONS: readonly SelectOption[] = [
  { value: AUTO_UNIT, label: 'auto', group: NOTATION_GROUP },
  ...VALUE_UNIT_OPTIONS.filter(option => !FORMULA_EXCLUDED_UNITS.has(String(option.value))),
];
