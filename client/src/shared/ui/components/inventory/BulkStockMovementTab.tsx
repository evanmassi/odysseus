import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';

import { Search } from 'lucide-react';

import { Autocomplete, Button, Divider, type AutocompleteOption } from '@shared/ui';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { BulkItemRow, type ItemPackaging } from './BulkItemRow';
import { SEARCH_INPUT_CLASS } from './bulkSearchInputStyle';
import { filterItemAutocompleteOptions } from './itemAutocompleteOptions';

import type { SelectOption } from '@shared/ui/primitives/select/types';

interface MovementRow<TExtra> {
  rowId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  locationId: string;
  extra: TExtra;
}

interface MovementLabels {
  emptyBody: string;
  countNoun: string;
  actionVerb: string;
  submitLabel: string;
  loadingText: string;
}

interface BulkStockMovementTabProps<TItem extends { id: string; name: string }, TExtra> {
  items: TItem[];
  itemOptions: AutocompleteOption[];
  locationOptions: SelectOption[];
  labels: MovementLabels;
  isPending: boolean;
  onSubmit: (
    rows: { itemId: string; locationId: string; quantity: number; extra: TExtra }[]
  ) => void;
  onComplete: () => void;
  useItemPackaging: (itemId: string) => ItemPackaging;
  renderScanInput: (onItemFound: (itemId: string) => void) => ReactNode;
  extraFields?: {
    initial: TExtra;
    render: (extra: TExtra, update: (patch: Partial<TExtra>) => void) => ReactNode;
  };
}

export function BulkStockMovementTab<TItem extends { id: string; name: string }, TExtra>({
  items,
  itemOptions,
  locationOptions,
  labels,
  isPending,
  onSubmit,
  onComplete,
  useItemPackaging,
  renderScanInput,
  extraFields,
}: BulkStockMovementTabProps<TItem, TExtra>) {
  const [rows, setRows] = useState<MovementRow<TExtra>[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [lastLocationId, setLastLocationId] = useState('');
  const nextRowId = useRef(0);

  const addItem = useCallback(
    (itemId: string, itemName: string) => {
      const rowId = `row-${nextRowId.current++}`;
      setRows(prev => [
        ...prev,
        {
          rowId,
          itemId,
          itemName,
          quantity: 0,
          locationId: lastLocationId,
          extra: extraFields?.initial as TExtra,
        },
      ]);
    },
    [lastLocationId, extraFields]
  );

  const handleAddItem = useCallback(
    (option: AutocompleteOption) => {
      addItem(option.value, option.label);
      setSearchValue('');
    },
    [addItem]
  );

  const handleScanItem = useCallback(
    (itemId: string) => {
      const item = items.find(i => i.id === itemId);
      if (item) addItem(item.id, item.name);
    },
    [items, addItem]
  );

  const updateQuantity = useCallback((rowId: string, quantity: number) => {
    setRows(prev => prev.map(row => (row.rowId === rowId ? { ...row, quantity } : row)));
  }, []);

  const updateLocation = useCallback((rowId: string, locationId: string) => {
    setLastLocationId(locationId);
    setRows(prev => prev.map(row => (row.rowId === rowId ? { ...row, locationId } : row)));
  }, []);

  const updateExtra = useCallback((rowId: string, patch: Partial<TExtra>) => {
    setRows(prev =>
      prev.map(row => (row.rowId === rowId ? { ...row, extra: { ...row.extra, ...patch } } : row))
    );
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(row => row.rowId !== rowId));
  }, []);

  const visibleOptions = useMemo(
    () => filterItemAutocompleteOptions(itemOptions, searchValue),
    [itemOptions, searchValue]
  );

  const validRows = useMemo(() => rows.filter(row => row.quantity > 0 && row.locationId), [rows]);

  const handleSubmit = useCallback(() => {
    if (validRows.length === 0) return;
    onSubmit(
      validRows.map(row => ({
        itemId: row.itemId,
        locationId: row.locationId,
        quantity: row.quantity,
        extra: row.extra,
      }))
    );
    setRows([]);
  }, [validRows, onSubmit]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 flex-shrink-0 flex items-start gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10" />
          <Autocomplete
            options={visibleOptions}
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleAddItem}
            placeholder="Search items..."
            fullWidth
            inputClassName={SEARCH_INPUT_CLASS}
          />
        </div>
        <div className="flex-1">{renderScanInput(handleScanItem)}</div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-2">
          {rows.length === 0 && (
            <p className="text-body-sm text-muted-foreground text-center py-8">
              {labels.emptyBody}
            </p>
          )}

          {rows.map(row => (
            <BulkItemRow
              key={row.rowId}
              rowId={row.rowId}
              itemId={row.itemId}
              itemName={row.itemName}
              locationId={row.locationId}
              locationOptions={locationOptions}
              onLocationChange={updateLocation}
              onQuantityChange={updateQuantity}
              onRemove={removeRow}
              useItemPackaging={useItemPackaging}
            >
              {extraFields?.render(row.extra, patch => updateExtra(row.rowId, patch))}
            </BulkItemRow>
          ))}
        </div>
      </ScrollArea>

      <div className="relative flex items-center justify-between px-4 py-3 border-t border-line-faint flex-shrink-0">
        <Divider tone="primary" className="absolute inset-x-0 -top-px" />
        <span className="text-caption text-muted-foreground">
          {validRows.length} {labels.countNoun}
          {validRows.length !== 1 ? 's' : ''} to {labels.actionVerb}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onComplete}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={validRows.length === 0}
            isLoading={isPending}
            loadingText={labels.loadingText}
          >
            {labels.submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
