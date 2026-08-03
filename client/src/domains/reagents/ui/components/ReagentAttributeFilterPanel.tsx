/**
 * Reagent Attribute Filter Panel
 *
 * Binds the shared facet panel to the reagent list and adds the expiry group, which is the one
 * facet no other catalog has.
 */

import { useMemo } from 'react';

import { AttributeFilterPanel, FacetGroup } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives';

import {
  countActiveFilters,
  expiryBucket,
  toggleExpiryBucket,
  EMPTY_REAGENT_FILTERS,
  type ReagentExpiryBucket,
  type ReagentFilters,
} from '../../utils/reagentAttributeFilter';

import type {
  AttributeDefinition,
  AttributeOption,
  ReagentItemWithStock,
} from '@odysseus/shared-schemas';

const EXPIRY_BUCKETS: Array<{ id: ReagentExpiryBucket; label: string }> = [
  { id: 'expired', label: 'Expired' },
  { id: 'expiring', label: 'Expiring soon' },
  { id: 'in-date', label: 'In date' },
];

interface ReagentAttributeFilterPanelProps {
  definitions: AttributeDefinition[];
  options: AttributeOption[];
  /** Every reagent in the current view scope, not the filtered set, so a group never vanishes as you narrow. */
  items: ReagentItemWithStock[];
  matchCount: number;
  filters: ReagentFilters;
  onChange: (filters: ReagentFilters) => void;
}

export function ReagentAttributeFilterPanel({
  definitions,
  options,
  items,
  matchCount,
  filters,
  onChange,
}: ReagentAttributeFilterPanelProps) {
  const expiryCounts = useMemo(() => {
    const counts = new Map<ReagentExpiryBucket, number>();
    items.forEach(item => {
      const bucket = expiryBucket(item);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    });
    return counts;
  }, [items]);

  return (
    <AttributeFilterPanel
      definitions={definitions}
      options={options}
      items={items}
      matchCount={matchCount}
      filters={filters}
      activeCount={countActiveFilters(filters)}
      onChange={onChange}
      onClearAll={() => onChange(EMPTY_REAGENT_FILTERS)}
      emptyMessage="No reagent carries an attribute value yet — set some on a reagent and its facets appear here."
      extraFacets={
        <FacetGroup label="Expiry">
          {EXPIRY_BUCKETS.map(bucket => (
            <Chip
              key={bucket.id}
              size="xs"
              behavior="selectable"
              lead={expiryCounts.get(bucket.id) ?? 0}
              selected={filters.expiry.includes(bucket.id)}
              onSelect={() => onChange(toggleExpiryBucket(filters, bucket.id))}
            >
              {bucket.label}
            </Chip>
          ))}
        </FacetGroup>
      }
    />
  );
}
