/**
 * Reagent List Filters
 *
 * Facet matching for the reagent list: OR within one attribute, AND across attributes, which is
 * what makes "any FITC or PE antibody that is also a primary" mean what it reads like. Runs
 * client-side off the list row's attribute summary — the same rule the alert panels follow.
 */

import { resolveExpiryBadge } from './reagentExpiry';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

export type ReagentExpiryBucket = 'expired' | 'expiring' | 'in-date';

export interface ReagentFilters {
  /** Selected option ids per attribute definition. */
  optionIds: Record<string, string[]>;
  expiry: ReagentExpiryBucket[];
}

export const EMPTY_REAGENT_FILTERS: ReagentFilters = { optionIds: {}, expiry: [] };

export function expiryBucket(item: ReagentItemWithStock): ReagentExpiryBucket {
  const badge = resolveExpiryBadge(item);
  if (!badge) return 'in-date';
  return badge.tone === 'danger' ? 'expired' : 'expiring';
}

export function countActiveFilters(filters: ReagentFilters): number {
  const options = Object.values(filters.optionIds).reduce((total, ids) => total + ids.length, 0);
  return options + filters.expiry.length;
}

export function matchesReagentFilters(
  item: ReagentItemWithStock,
  filters: ReagentFilters
): boolean {
  const attributesMatch = Object.entries(filters.optionIds).every(
    ([definitionId, ids]) =>
      ids.length === 0 ||
      item.attributeValues.some(
        value =>
          value.definitionId === definitionId &&
          !!value.valueOptionId &&
          ids.includes(value.valueOptionId)
      )
  );
  if (!attributesMatch) return false;

  return filters.expiry.length === 0 || filters.expiry.includes(expiryBucket(item));
}

export function toggleFilterOption(
  filters: ReagentFilters,
  definitionId: string,
  optionId: string
): ReagentFilters {
  const current = filters.optionIds[definitionId] ?? [];
  const next = current.includes(optionId)
    ? current.filter(id => id !== optionId)
    : [...current, optionId];

  const optionIds = { ...filters.optionIds, [definitionId]: next };
  if (next.length === 0) delete optionIds[definitionId];
  return { ...filters, optionIds };
}

export function toggleExpiryBucket(
  filters: ReagentFilters,
  bucket: ReagentExpiryBucket
): ReagentFilters {
  return {
    ...filters,
    expiry: filters.expiry.includes(bucket)
      ? filters.expiry.filter(value => value !== bucket)
      : [...filters.expiry, bucket],
  };
}
