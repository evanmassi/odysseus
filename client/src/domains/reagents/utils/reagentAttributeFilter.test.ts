/**
 * Reagent List Filters
 *
 * The semantics are the whole feature: picking two fluorophores must widen the result, picking a
 * fluorophore and a hazard must narrow it. These cases pin that asymmetry down.
 */

import { describe, expect, it } from 'vitest';

import {
  EMPTY_REAGENT_FILTERS,
  countActiveFilters,
  expiryBucket,
  matchesReagentFilters,
  toggleFilterOption,
} from './reagentAttributeFilter';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

const item = (
  values: Array<{ definitionId: string; valueOptionId: string }>,
  overrides: Partial<ReagentItemWithStock> = {}
): ReagentItemWithStock =>
  ({
    id: 'ritm',
    name: 'Test',
    status: 'active',
    totalStock: 1,
    lotCount: 1,
    expiredLotCount: 0,
    locationNames: [],
    attributeValues: values.map(value => ({
      ...value,
      valueText: null,
      valueNumber: null,
    })),
    ...overrides,
  }) as ReagentItemWithStock;

const FITC = { definitionId: 'fluor', valueOptionId: 'fitc' };
const PE = { definitionId: 'fluor', valueOptionId: 'pe' };
const FLAMMABLE = { definitionId: 'hazard', valueOptionId: 'flammable' };

describe('matchesReagentFilters', () => {
  it('keeps everything when nothing is selected', () => {
    expect(matchesReagentFilters(item([]), EMPTY_REAGENT_FILTERS)).toBe(true);
  });

  it('ORs the options within one attribute', () => {
    const filters = { optionIds: { fluor: ['fitc', 'pe'] }, expiry: [] };

    expect(matchesReagentFilters(item([FITC]), filters)).toBe(true);
    expect(matchesReagentFilters(item([PE]), filters)).toBe(true);
    expect(matchesReagentFilters(item([FLAMMABLE]), filters)).toBe(false);
  });

  it('ANDs across attributes', () => {
    const filters = { optionIds: { fluor: ['fitc'], hazard: ['flammable'] }, expiry: [] };

    expect(matchesReagentFilters(item([FITC, FLAMMABLE]), filters)).toBe(true);
    expect(matchesReagentFilters(item([FITC]), filters)).toBe(false);
  });

  it('filters by expiry bucket', () => {
    const expired = item([], { expiredLotCount: 2 });
    const inDate = item([]);
    const filters = { optionIds: {}, expiry: ['expired' as const] };

    expect(matchesReagentFilters(expired, filters)).toBe(true);
    expect(matchesReagentFilters(inDate, filters)).toBe(false);
  });

  it('requires both an attribute and an expiry match when both are set', () => {
    const filters = { optionIds: { fluor: ['fitc'] }, expiry: ['expired' as const] };

    expect(matchesReagentFilters(item([FITC], { expiredLotCount: 1 }), filters)).toBe(true);
    expect(matchesReagentFilters(item([FITC]), filters)).toBe(false);
  });
});

describe('expiryBucket', () => {
  it('reads expired off the lot count and in-date off an absent badge', () => {
    expect(expiryBucket(item([], { expiredLotCount: 1 }))).toBe('expired');
    expect(expiryBucket(item([]))).toBe('in-date');
  });
});

describe('toggleFilterOption', () => {
  it('drops the attribute entirely once its last option is cleared', () => {
    const selected = toggleFilterOption(EMPTY_REAGENT_FILTERS, 'fluor', 'fitc');
    expect(countActiveFilters(selected)).toBe(1);

    const cleared = toggleFilterOption(selected, 'fluor', 'fitc');
    expect(cleared.optionIds).toEqual({});
    expect(countActiveFilters(cleared)).toBe(0);
  });
});
