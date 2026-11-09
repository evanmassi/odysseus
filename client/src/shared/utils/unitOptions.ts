import {
  UNIT_REGISTRY,
  type UnitKind,
  type UnitKindValue,
  type UnitRegistryEntry,
} from '@odysseus/shared-schemas';

import { withPlaceholder } from '@shared/ui';

import type { SelectOption } from '@shared/ui/primitives/select/types';

const CONCENTRATION_UNIT_KINDS: UnitKindValue[] = [
  'molarity',
  'mass-conc',
  'count-conc',
  'percent',
  'activity-conc',
  'fold',
];

const AMOUNT_UNIT_KINDS: UnitKindValue[] = ['mass', 'volume', 'activity', 'count'];

const UNIT_KIND_LABELS: Record<UnitKind, string> = {
  mass: 'Mass',
  volume: 'Volume',
  molarity: 'Molarity',
  'mass-conc': 'Mass concentration',
  'count-conc': 'Count concentration',
  percent: 'Percent',
  activity: 'Activity',
  'activity-conc': 'Activity concentration',
  fold: 'Fold',
  'cell-conc': 'Cell concentration',
  count: 'Count',
  'cell-count': 'Cell count',
  'molar-mass': 'Molar mass',
  time: 'Time',
  temperature: 'Temperature',
  'g-force': 'G-force',
  'rotor-speed': 'Rotor speed',
};

const UNIT_KIND_EXAMPLES: Record<UnitKindValue, string> = {
  mass: 'g, mg, µg, ng, pg, kg',
  volume: 'L, mL, µL, nL',
  activity: 'U',
  count: 'vial, tube, each, box, pack, case',
  molarity: 'M, mM, µM, nM, pM',
  'mass-conc': 'mg/mL, ng/mL, µg/µL',
  'count-conc': 'cells/mL, beads/mL, IU/mL',
  'activity-conc': 'U/mL',
  percent: '%',
  fold: 'X',
  'cell-conc': 'c/mL, c/v',
};

const INVENTORY_GROUP = 'Inventory units';
const CONCENTRATION_GROUP = 'Concentration units';

export const unitKindLabel = (kind: UnitKind): string => UNIT_KIND_LABELS[kind];

// PITFALL: cell concentration is tube-only and code-fixed, so a lab can never add a unit to it.
export const CUSTOM_UNIT_KIND_OPTIONS: SelectOption[] = [
  ...AMOUNT_UNIT_KINDS.map(kind => ({ kind, group: INVENTORY_GROUP })),
  ...CONCENTRATION_UNIT_KINDS.map(kind => ({ kind, group: CONCENTRATION_GROUP })),
].map(({ kind, group }) => ({
  value: kind,
  label: UNIT_KIND_LABELS[kind],
  description: UNIT_KIND_EXAMPLES[kind],
  group,
}));

const customUnitEntries = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): UnitRegistryEntry[] =>
  customUnits.map(unit => ({ id: unit.label, label: unit.label, kind: unit.kind }));

const unitsOfKind = (
  kinds: UnitKind[],
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): UnitRegistryEntry[] =>
  [...UNIT_REGISTRY, ...customUnitEntries(customUnits)].filter(unit => kinds.includes(unit.kind));

const toOptions = (units: UnitRegistryEntry[]): SelectOption[] =>
  withPlaceholder(
    'Select unit...',
    units.map(unit => ({ value: unit.id, label: unit.label }))
  );

export const concentrationUnitOptions = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): SelectOption[] => toOptions(unitsOfKind(CONCENTRATION_UNIT_KINDS, customUnits));

export const CONCENTRATION_UNIT_IDS = unitsOfKind(CONCENTRATION_UNIT_KINDS, []).map(
  unit => unit.id
);

export const amountUnitOptions = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): SelectOption[] => toOptions(unitsOfKind(AMOUNT_UNIT_KINDS, customUnits));

export const packUnits = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): UnitRegistryEntry[] => unitsOfKind(['count'], customUnits);
