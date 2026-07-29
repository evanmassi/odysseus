/**
 * Catalog Rail
 *
 * Flat, alphabetical list of every editable lab vocabulary with its entry count.
 * Selecting a leaf swaps the pane beside it; a taxonomy was rejected because the
 * lab-defined attribute vocabularies can't be classified in advance. No tree-line
 * overlay: a flat list has no parent rows to connect.
 */

import { useMemo, useState } from 'react';

import { SearchInput } from '@shared/ui';

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

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return leaves;
    return leaves.filter(leaf => leaf.title.toLowerCase().includes(query));
  }, [leaves, filter]);

  return (
    <div className="flex w-52 flex-shrink-0 flex-col gap-2">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Filter lists…"
        size="sm"
        aria-label="Filter vocabularies"
      />

      <div className="nav-tree nav-tree-well">
        {visible.map(leaf => {
          const isSelected = leaf.category === selected;
          return (
            <div
              key={leaf.category}
              role="button"
              tabIndex={0}
              aria-current={isSelected ? 'true' : undefined}
              className={`nav-tree-row nav-tree-row--rail ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelect(leaf.category)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSelect(leaf.category);
              }}
            >
              <span className="nav-tree-row__label min-w-0 flex-1 truncate font-display text-body-sm">
                {leaf.title}
              </span>
              <span className="flex-shrink-0 font-mono text-data-sm tracking-data text-foreground/45">
                {counts[leaf.category]}
              </span>
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="px-2 py-3 text-caption italic text-muted-foreground">No lists match</p>
        )}
      </div>
    </div>
  );
}
