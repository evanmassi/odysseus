/**
 * Unit Options
 *
 * Builds the dropdown options for a unit field from the registry plus the lab's custom
 * units, filtered per field: ratios for concentration, absolute measures for stock,
 * countables for packaging. Cell concentration is a tube dimension and belongs to none of
 * them. Read these through `useUnitOptions`, which supplies the lab's half.
 */

import { UNIT_REGISTRY, type UnitKind, type UnitRegistryEntry } from '@odysseus/shared-schemas';

import { withPlaceholder } from '@shared/ui';

import type { SelectOption } from '@shared/ui/primitives/select/types';

const CONCENTRATION_UNIT_KINDS: UnitKind[] = [
  'molarity',
  'mass-conc',
  'count-conc',
  'percent',
  'activity-conc',
  'fold',
];

const AMOUNT_UNIT_KINDS: UnitKind[] = ['mass', 'volume', 'activity', 'count'];

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
};

// Registry examples per dimension. Without them, Count and Count concentration are one word
// apart with nothing to tell them by.
const UNIT_KIND_EXAMPLES: Record<UnitKind, string> = {
  mass: 'g, mg, µg, ng, kg',
  volume: 'L, mL, µL, nL',
  activity: 'U',
  count: 'vial, tube, each, box, pack, case',
  molarity: 'M, mM, µM, nM, pM',
  'mass-conc': 'mg/mL, µg/µL, ng/µL',
  'count-conc': 'cells/mL, beads/mL, IU/mL',
  'activity-conc': 'U/mL',
  percent: '%',
  fold: 'X',
  'cell-conc': 'c/mL, c/v',
};

const INVENTORY_GROUP = 'Inventory units';
const CONCENTRATION_GROUP = 'Concentration units';

export const unitKindLabel = (kind: UnitKind): string => UNIT_KIND_LABELS[kind];

/**
 * Dimensions a lab may add a unit to — cell concentration is tube-only and code-fixed. The two
 * families are what decide which fields a unit reaches, so the dropdown groups by them rather
 * than running one alphabetical list that interleaves the pair.
 */
export const CUSTOM_UNIT_KIND_OPTIONS: SelectOption[] = [
  ...AMOUNT_UNIT_KINDS.map(kind => ({ kind, group: INVENTORY_GROUP })),
  ...CONCENTRATION_UNIT_KINDS.map(kind => ({ kind, group: CONCENTRATION_GROUP })),
].map(({ kind, group }) => ({
  value: kind,
  label: UNIT_KIND_LABELS[kind],
  description: UNIT_KIND_EXAMPLES[kind],
  group,
}));

/** A lab unit is stored as its label, exactly as registry ids are, so both render verbatim. */
export const customUnitEntries = (
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

export const amountUnitOptions = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): SelectOption[] => toOptions(unitsOfKind(AMOUNT_UNIT_KINDS, customUnits));

/** Countable units a pack can be measured in; the chain's base is the item's stock unit. */
export const packUnits = (
  customUnits: ReadonlyArray<{ label: string; kind: UnitKind }>
): UnitRegistryEntry[] => unitsOfKind(['count'], customUnits);
