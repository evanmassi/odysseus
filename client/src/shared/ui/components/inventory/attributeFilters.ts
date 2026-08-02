/**
 * Attribute Filters
 *
 * Facet matching for an item list: OR within one attribute, AND across attributes. The helpers
 * are generic over the filter shape, so a catalog that adds facets keeps them through a toggle.
 */

import type { AttributeSummary } from '@odysseus/shared-schemas';

export interface AttributeFilters {
  /** Selected option ids per attribute definition. */
  optionIds: Record<string, string[]>;
}

export const EMPTY_ATTRIBUTE_FILTERS: AttributeFilters = { optionIds: {} };

export function countAttributeFilters(filters: AttributeFilters): number {
  return Object.values(filters.optionIds).reduce((total, ids) => total + ids.length, 0);
}

export function matchesAttributeFilters(
  attributeValues: AttributeSummary[],
  filters: AttributeFilters
): boolean {
  return Object.entries(filters.optionIds).every(
    ([definitionId, ids]) =>
      ids.length === 0 ||
      attributeValues.some(
        value =>
          value.definitionId === definitionId &&
          !!value.valueOptionId &&
          ids.includes(value.valueOptionId)
      )
  );
}

export function toggleFilterOption<TFilters extends AttributeFilters>(
  filters: TFilters,
  definitionId: string,
  optionId: string
): TFilters {
  const current = filters.optionIds[definitionId] ?? [];
  const next = current.includes(optionId)
    ? current.filter(id => id !== optionId)
    : [...current, optionId];

  const optionIds = { ...filters.optionIds, [definitionId]: next };
  if (next.length === 0) delete optionIds[definitionId];
  return { ...filters, optionIds };
}
