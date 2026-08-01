/**
 * Attribute Filters
 *
 * Facet matching for an item list: OR within one attribute, AND across attributes, which is what
 * makes "any FITC or PE antibody that is also a primary" mean what it reads like. Runs
 * client-side off the list row's attribute summary — the same rule the alert panels follow.
 *
 * A catalog with more to filter on extends this shape rather than replacing it; the helpers are
 * generic over the extension so its own facets survive a round trip.
 */

export interface AttributeFilters {
  /** Selected option ids per attribute definition. */
  optionIds: Record<string, string[]>;
}

/** The list-row summary each catalog carries for its items. */
export interface AttributeSummaryValue {
  definitionId: string;
  valueOptionId: string | null;
}

export const EMPTY_ATTRIBUTE_FILTERS: AttributeFilters = { optionIds: {} };

export function countAttributeFilters(filters: AttributeFilters): number {
  return Object.values(filters.optionIds).reduce((total, ids) => total + ids.length, 0);
}

export function matchesAttributeFilters(
  attributeValues: AttributeSummaryValue[],
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
