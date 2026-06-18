/**
 * Sort Dropdown
 *
 * Field and direction controls for search result ordering.
 */

import { ArrowUp, ArrowDown } from 'lucide-react';

import { useSearchStore, type SortField } from '@domains/search';
import { Select, Tooltip } from '@shared/ui';
import {
  headerSurface,
  HEADER_TOP_EDGE,
} from '@shared/ui/primitives/console-panel/consoleHeaderSurface';

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
    <div
      className="relative flex h-9 items-center gap-2.5 border-b border-line-soft px-4"
      style={{ background: headerSurface(true), boxShadow: HEADER_TOP_EDGE }}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-foreground/55">
        Sort
      </span>

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
          className="p-1 text-foreground/55 transition-colors hover:text-primary"
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
