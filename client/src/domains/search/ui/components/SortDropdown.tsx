import { ArrowUp, ArrowDown } from 'lucide-react';

import { useSearchStore, type SortField } from '@domains/search';
import { Tooltip } from '@shared/ui';

interface SortOption {
  value: SortField;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Date' },
  { value: 'cellType', label: 'Cell Type' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'lotNumber', label: 'Lot Number' },
];

export function SortDropdown() {
  const sortField = useSearchStore(state => state.sortField);
  const sortDirection = useSearchStore(state => state.sortDirection);
  const setSortField = useSearchStore(state => state.setSortField);
  const toggleSortDirection = useSearchStore(state => state.toggleSortDirection);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
      <span className="text-xs font-medium text-slate-600">Sort by:</span>

      {/* Sort Field Dropdown */}
      <select
        value={sortField}
        onChange={e => setSortField(e.target.value as SortField)}
        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 hover:border-slate-400 focus-ring-default"
      >
        {SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Sort Direction Toggle */}
      <Tooltip content={sortDirection === 'asc' ? 'Ascending' : 'Descending'} side="bottom">
        <button
          onClick={toggleSortDirection}
          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors focus-ring-default"
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
