/**
 * Catalog Rail
 *
 * Flat, alphabetical list of every editable lab vocabulary with its entry count.
 * Selecting a leaf swaps the pane beside it; a taxonomy was rejected because the
 * lab-defined attribute vocabularies can't be classified in advance.
 */

import { useMemo, useState } from 'react';

import { SearchInput, Tab, Tabs } from '@shared/ui';

import type { LookupCategory } from '@odysseus/shared-schemas';

export interface CatalogLeaf {
  category: LookupCategory;
  title: string;
  /** Catalogs a shared vocabulary feeds; a rename fans out to all of them. */
  usedBy?: string[];
}

interface CatalogRailProps {
  leaves: CatalogLeaf[];
  counts: Record<LookupCategory, number>;
  selected: LookupCategory;
  onSelect: (category: LookupCategory) => void;
}

export function CatalogRail({ leaves, counts, selected, onSelect }: CatalogRailProps) {
  const [filter, setFilter] = useState('');

  // The selected leaf stays listed even when it doesn't match, so the pane beside the
  // rail always has its row — and the sliding tab indicator always has a target.
  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return leaves;
    return leaves.filter(
      leaf => leaf.category === selected || leaf.title.toLowerCase().includes(query)
    );
  }, [leaves, filter, selected]);

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
        <Tabs
          orientation="vertical"
          size="sm"
          value={selected}
          onChange={value => onSelect(value as LookupCategory)}
        >
          {visible.map(leaf => (
            <Tab key={leaf.category} id={leaf.category}>
              <span className="flex items-center gap-2 leading-tight">
                <span className="min-w-0">{leaf.title}</span>
                <span className="ml-auto flex-shrink-0 font-mono text-data-sm tracking-data text-foreground/40">
                  {counts[leaf.category]}
                </span>
              </span>
            </Tab>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
