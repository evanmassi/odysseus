import { useMemo, type ReactNode } from 'react';

import { ScrollArea, Tooltip } from '@shared/ui';
import { Chip } from '@shared/ui/primitives';
import { PLAIN_SECTION_RULE } from '@shared/ui/primitives/titles/SectionHeader';
import { SubsectionHeader } from '@shared/ui/primitives/titles/SubsectionHeader';

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
  items: TItem[];
  matchCount: number;
  filters: TFilters;
  activeCount: number;
  onChange: (filters: TFilters) => void;
  onClearAll: () => void;
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

  const itemNoun = items.length === 1 ? 'item' : 'items';
  const matchLabel =
    matchCount === items.length
      ? `${items.length} ${itemNoun}`
      : `${matchCount} of ${items.length} ${itemNoun}`;

  return (
    <div className="mb-3 border-b border-line-faint px-1 pb-3">
      <div className="flex items-center gap-3 pb-2.5">
        <SubsectionHeader title="Filters" meta={matchLabel} />
        <span aria-hidden className={`h-px min-w-6 flex-1 ${PLAIN_SECTION_RULE}`} />
        <Tooltip content="Clear all filters" side="bottom">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="px-2 py-1 type-label text-label-2xs text-foreground/55 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-foreground/25 disabled:hover:text-foreground/25"
          >
            Clear All
          </button>
        </Tooltip>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3 pl-3">
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
