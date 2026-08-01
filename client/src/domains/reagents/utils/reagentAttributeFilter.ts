/**
 * Reagent List Filters
 *
 * The shared attribute facets plus the one axis only reagents have: how close a lot is to
 * expiring. Both are ANDed, so narrowing by fluorophore and by "expiring soon" means what it
 * reads like.
 */

import {
  countAttributeFilters,
  matchesAttributeFilters,
  type AttributeFilters,
} from '@shared/ui/components/inventory';

import { resolveExpiryBadge } from './reagentExpiry';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

export type ReagentExpiryBucket = 'expired' | 'expiring' | 'in-date';

export interface ReagentFilters extends AttributeFilters {
  expiry: ReagentExpiryBucket[];
}

export const EMPTY_REAGENT_FILTERS: ReagentFilters = { optionIds: {}, expiry: [] };

export function expiryBucket(item: ReagentItemWithStock): ReagentExpiryBucket {
  const badge = resolveExpiryBadge(item);
  if (!badge) return 'in-date';
  return badge.tone === 'danger' ? 'expired' : 'expiring';
}

export function countActiveFilters(filters: ReagentFilters): number {
  return countAttributeFilters(filters) + filters.expiry.length;
}

export function matchesReagentFilters(
  item: ReagentItemWithStock,
  filters: ReagentFilters
): boolean {
  if (!matchesAttributeFilters(item.attributeValues, filters)) return false;
  return filters.expiry.length === 0 || filters.expiry.includes(expiryBucket(item));
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
