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

const unitOptions = (kinds: UnitKind[], placeholder: string): SelectOption[] =>
  withPlaceholder(
    placeholder,
    UNIT_REGISTRY.filter(unit => kinds.includes(unit.kind)).map(unit => ({
      value: unit.id,
      label: unit.label,
    }))
  );

export const CONCENTRATION_UNIT_OPTIONS = unitOptions(
  ['molarity', 'mass-conc', 'count-conc', 'percent', 'activity-conc', 'fold'],
  'Select unit...'
);

export const AMOUNT_UNIT_OPTIONS = unitOptions(
  ['mass', 'volume', 'activity', 'count'],
  'Select unit...'
);

/** Countable units a pack can be measured in; the chain's base is the item's stock unit. */
export const PACK_UNITS = UNIT_REGISTRY.filter(unit => unit.kind === 'count');
