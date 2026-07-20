/**
 * Sort Controls
 *
 * Sort-field dropdown + ascending/descending toggle, shared by the equipment
 * and supplies list toolbars.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Select, Tooltip } from '../../primitives';

import type { SelectOption } from '../../primitives';

export type InventorySortField = 'name' | 'manufacturer' | 'dateAdded';

export const INVENTORY_SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'dateAdded', label: 'Date Added' },
];

interface SortControlsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  direction: 'asc' | 'desc';
  onToggleDirection: () => void;
  options: SelectOption[];
}

export function SortControls<T extends string>({
  value,
  onChange,
  direction,
  onToggleDirection,
  options,
}: SortControlsProps<T>) {
  return (
    <>
      <span className="flex-shrink-0 text-body-sm font-medium text-secondary-foreground">Sort</span>
      <Select
        options={options}
        value={value}
        onChange={v => onChange(v as T)}
        size="xs"
        aria-label="Sort field"
        className="w-32"
      />
      <Tooltip content={direction === 'asc' ? 'Ascending' : 'Descending'} side="bottom">
        <button
          type="button"
          onClick={onToggleDirection}
          aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
          className="rounded p-1 text-secondary-foreground transition-colors hover:bg-secondary hover:text-accent-foreground"
        >
          {direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </button>
      </Tooltip>
    </>
  );
}
