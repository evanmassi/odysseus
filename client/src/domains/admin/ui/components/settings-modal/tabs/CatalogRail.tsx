/**
 * Catalog Rail
 *
 * Every editable lab vocabulary with its entry count, grouped by the mechanism behind it.
 * Grouping by mechanism rather than meaning is what survives lab-defined attributes: a new
 * one classifies itself.
 */

import { useMemo, useState } from 'react';

import { SearchInput, Tab, TabGroup, Tabs } from '@shared/ui';

export interface CatalogLeaf {
  id: string;
  title: string;
  group: string;
  /** Omitted where there is no vocabulary to count, as on a free-text attribute. */
  count?: number;
  /** Catalogs a shared vocabulary feeds; a rename fans out to all of them. */
  usedBy?: string[];
}

interface CatalogRailProps {
  leaves: CatalogLeaf[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CatalogRail({ leaves, selected, onSelect }: CatalogRailProps) {
  const [filter, setFilter] = useState('');

  // The selected leaf stays listed even when it doesn't match, so the pane beside the
  // rail always has its row — and the sliding tab indicator always has a target.
  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return leaves;
    return leaves.filter(leaf => leaf.id === selected || leaf.title.toLowerCase().includes(query));
  }, [leaves, filter, selected]);

  const groups = useMemo(() => Array.from(new Set(visible.map(leaf => leaf.group))), [visible]);

  return (
    <div className="flex w-60 flex-shrink-0 flex-col gap-2">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Filter lists…"
        size="sm"
        aria-label="Filter vocabularies"
      />

      <div className="border border-line-faint py-1">
        <Tabs orientation="vertical" size="sm" value={selected} onChange={onSelect}>
          {groups.map(group => (
            <TabGroup key={group} label={group}>
              {visible
                .filter(leaf => leaf.group === group)
                .map(leaf => (
                  <Tab key={leaf.id} id={leaf.id}>
                    <span className="flex items-center gap-2 leading-tight">
                      <span className="min-w-0">{leaf.title}</span>
                      {leaf.count !== undefined && (
                        <span className="ml-auto flex-shrink-0 font-mono text-data-sm tracking-data text-foreground/40">
                          {leaf.count}
                        </span>
                      )}
                    </span>
                  </Tab>
                ))}
            </TabGroup>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
