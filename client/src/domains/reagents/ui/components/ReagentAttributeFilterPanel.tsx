/**
 * Reagent Attribute Filter Panel
 *
 * Facet chips for the reagent list, on the same chassis as the search and audit filter panels:
 * header strip, persistent Clear All, chip groups. Only attributes some reagent actually carries
 * get a group — a lab's full palette would be mostly dead rows — and each chip counts its reagents.
 */

import { useMemo, type ReactNode } from 'react';

import { AccentTick, ScrollArea, Tooltip } from '@shared/ui';
import { Chip } from '@shared/ui/primitives';
import {
  headerSurface,
  HEADER_TOP_EDGE,
} from '@shared/ui/primitives/console-panel/consoleHeaderSurface';

import {
  countActiveFilters,
  expiryBucket,
  toggleExpiryBucket,
  toggleFilterOption,
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
  /** Every reagent, not the filtered set, so a group never vanishes as you narrow. */
  items: ReagentItemWithStock[];
  matchCount: number;
  filters: ReagentFilters;
  onChange: (filters: ReagentFilters) => void;
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 type-label text-label-2xs text-foreground/55">{label}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} filters`}>
        {children}
      </div>
    </div>
  );
}

export function ReagentAttributeFilterPanel({
  definitions,
  options,
  items,
  matchCount,
  filters,
  onChange,
}: ReagentAttributeFilterPanelProps) {
  const optionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(item => {
      item.attributeValues.forEach(value => {
        if (!value.valueOptionId) return;
        counts.set(value.valueOptionId, (counts.get(value.valueOptionId) ?? 0) + 1);
      });
    });
    return counts;
  }, [items]);

  const expiryCounts = useMemo(() => {
    const counts = new Map<ReagentExpiryBucket, number>();
    items.forEach(item => {
      const bucket = expiryBucket(item);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    });
    return counts;
  }, [items]);

  const groups = useMemo(
    () =>
      definitions
        .map(definition => ({
          definition,
          options: options.filter(
            option =>
              option.definitionId === definition.id &&
              (optionCounts.has(option.id) || filters.optionIds[definition.id]?.includes(option.id))
          ),
        }))
        .filter(group => group.options.length > 0),
    [definitions, options, optionCounts, filters.optionIds]
  );

  const activeCount = countActiveFilters(filters);

  return (
    <div className="mb-2 border border-line-soft bg-card">
      <div
        className="relative flex items-center justify-between border-b border-line-soft px-4 py-2.5"
        style={{ background: headerSurface(true), boxShadow: HEADER_TOP_EDGE }}
      >
        <div className="flex items-center gap-2.5">
          <AccentTick />
          <span className="type-label text-label-xs tracking-label-wide text-foreground/70">
            Filters
          </span>
          <span className="font-mono text-data-sm tracking-data text-foreground/45">
            {activeCount > 0 ? `${matchCount} of ${items.length}` : `${items.length}`}
            <span className="text-foreground/30"> {items.length === 1 ? 'item' : 'items'}</span>
          </span>
        </div>
        <Tooltip content="Clear all filters" side="bottom">
          <button
            type="button"
            onClick={() => onChange({ optionIds: {}, expiry: [] })}
            disabled={activeCount === 0}
            className="px-2 py-1 type-label text-label-2xs text-foreground/55 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:text-foreground/25 disabled:hover:text-foreground/25"
          >
            Clear All
          </button>
        </Tooltip>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3 px-4 py-3">
          {groups.length === 0 ? (
            <p className="text-caption text-muted-foreground">
              No reagent carries an attribute value yet — set some on a reagent and its facets
              appear here.
            </p>
          ) : (
            groups.map(({ definition, options: groupOptions }) => (
              <FacetGroup key={definition.id} label={definition.name}>
                {groupOptions.map(option => (
                  <Chip
                    key={option.id}
                    size="xs"
                    behavior="selectable"
                    lead={optionCounts.get(option.id) ?? 0}
                    selected={!!filters.optionIds[definition.id]?.includes(option.id)}
                    onSelect={() => onChange(toggleFilterOption(filters, definition.id, option.id))}
                  >
                    {option.value}
                  </Chip>
                ))}
              </FacetGroup>
            ))
          )}

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
        </div>
      </ScrollArea>
    </div>
  );
}
