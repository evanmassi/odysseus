/**
 * Sort Dropdown
 *
 * Field and direction controls for search result ordering.
 */

import { ArrowUp, ArrowDown } from 'lucide-react';

import { useSearchStore, type SortField } from '@domains/search';
import { Select, Tooltip } from '@shared/ui';

import type { SelectOption } from '@shared/ui';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Date' },
  { value: 'cellType', label: 'Cell Type' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'lotNumber', label: 'Lot Number' },
];

export function SearchSortControls() {
  const sortField = useSearchStore(state => state.sortField);
  const sortDirection = useSearchStore(state => state.sortDirection);
  const setSortField = useSearchStore(state => state.setSortField);
  const toggleSortDirection = useSearchStore(state => state.toggleSortDirection);

  return (
    <div className="flex items-center gap-2 h-9 px-4 bg-muted border-b border-border">
      <span className="text-xs font-medium text-secondary-foreground">Sort by:</span>

      <Select
        options={SORT_OPTIONS}
        value={sortField}
        onChange={value => setSortField(value as SortField)}
        size="xs"
        aria-label="Sort field"
        className="w-32"
      />

      <Tooltip content={sortDirection === 'asc' ? 'Ascending' : 'Descending'} side="bottom">
        <button
          onClick={toggleSortDirection}
          className="p-1 text-secondary-foreground hover:text-accent-foreground hover:bg-secondary rounded transition-colors"
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
