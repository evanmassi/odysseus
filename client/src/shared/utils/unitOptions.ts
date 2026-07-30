/**
 * Unit Options
 *
 * Dropdown options drawn from the shared unit registry, filtered per field: ratios
 * for concentration, absolute measures for stock, countables for packaging. Cell
 * concentration is a tube dimension and belongs to none of them.
 */

import { UNIT_REGISTRY, type UnitKind } from '@odysseus/shared-schemas';

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

export const unitKindLabel = (kind: UnitKind): string => UNIT_KIND_LABELS[kind];

/** Dimensions a lab may add a unit to — cell concentration is tube-only and code-fixed. */
export const CUSTOM_UNIT_KIND_OPTIONS: SelectOption[] = [
  ...AMOUNT_UNIT_KINDS,
  ...CONCENTRATION_UNIT_KINDS,
]
  .map(kind => ({ value: kind, label: UNIT_KIND_LABELS[kind] }))
  .sort((a, b) => a.label.localeCompare(b.label));

const unitOptions = (kinds: UnitKind[], placeholder: string): SelectOption[] =>
  withPlaceholder(
    placeholder,
    UNIT_REGISTRY.filter(unit => kinds.includes(unit.kind)).map(unit => ({
      value: unit.id,
      label: unit.label,
    }))
  );

export const CONCENTRATION_UNIT_OPTIONS = unitOptions(CONCENTRATION_UNIT_KINDS, 'Select unit...');

export const AMOUNT_UNIT_OPTIONS = unitOptions(AMOUNT_UNIT_KINDS, 'Select unit...');

/** Countable units a pack can be measured in; the chain's base is the item's stock unit. */
export const PACK_UNITS = UNIT_REGISTRY.filter(unit => unit.kind === 'count');
