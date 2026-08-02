/**
 * Attribute Filter Panel
 *
 * Facet chips for an item list. Only attributes some item actually carries get a group, since a
 * lab's full palette would be mostly dead rows.
 */

import { useMemo, type ReactNode } from 'react';

import { AccentTick, ScrollArea, Tooltip } from '@shared/ui';
import { Chip } from '@shared/ui/primitives';
import {
  headerSurface,
  HEADER_TOP_EDGE,
} from '@shared/ui/primitives/console-panel/consoleHeaderSurface';

import { toggleFilterOption, type AttributeFilters } from './attributeFilters';

import type {
  AttributeDefinition,
  AttributeOption,
  AttributeSummary,
} from '@odysseus/shared-schemas';

interface FilterableItem {
  attributeValues: AttributeSummary[];
}

interface AttributeFilterPanelProps<
  TItem extends FilterableItem,
  TFilters extends AttributeFilters,
> {
  definitions: AttributeDefinition[];
  options: AttributeOption[];
  /** Every item, not the filtered set, so a group never vanishes as you narrow. */
  items: TItem[];
  matchCount: number;
  filters: TFilters;
  /** Includes any facets the caller added, so Clear All lights up for those too. */
  activeCount: number;
  onChange: (filters: TFilters) => void;
  onClearAll: () => void;
  /** Shown when no item carries an attribute value yet. */
  emptyMessage: string;
  extraFacets?: ReactNode;
}

export function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 type-label text-label-2xs text-foreground/55">{label}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} filters`}>
        {children}
      </div>
    </div>
  );
}

export function AttributeFilterPanel<
  TItem extends FilterableItem,
  TFilters extends AttributeFilters,
>({
  definitions,
  options,
  items,
  matchCount,
  filters,
  activeCount,
  onChange,
  onClearAll,
  emptyMessage,
  extraFacets,
}: AttributeFilterPanelProps<TItem, TFilters>) {
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
            onClick={onClearAll}
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
            <p className="text-caption text-muted-foreground">{emptyMessage}</p>
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

          {extraFacets}
        </div>
      </ScrollArea>
    </div>
  );
}
