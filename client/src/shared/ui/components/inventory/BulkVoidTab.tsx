/**
 * Bulk Void Tab
 *
 * Pick an item, tick the movements to reverse, submit them under one reason. What a tick owns is
 * the catalog's call: a supply movement is one ledger row, a reagent's FEFO draw is one per lot.
 */

import { useState, useMemo, useCallback, type ReactNode } from 'react';

import { Search } from 'lucide-react';

import { useLabLocationsQuery } from '@domains/lab-management';
import { Autocomplete, Button, Checkbox, NubDivider, type AutocompleteOption } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { SEARCH_INPUT_CLASS } from './bulkSearchInputStyle';
import { filterItemAutocompleteOptions } from './itemAutocompleteOptions';
import { transactionTypeDisplay } from './transactionTypeDisplay';

export interface VoidableEntry {
  /** Row key and unit of selection. */
  id: string;
  /** The ledger rows this entry reverses — one per lot for a movement that drew across several. */
  transactionIds: string[];
  type: string;
  createdAt: Date | string;
  locationId: string;
  /** Signed and unit-formatted; each catalog spells its own quantities. */
  quantityLabel: string;
  /** Optional trailing note, e.g. how many lots the movement touched. */
  note?: string;
}

interface BulkVoidTabProps<TItem extends { id: string; name: string }> {
  items: TItem[];
  itemOptions: AutocompleteOption[];
  isPending: boolean;
  /** The selected item's reversible movements, in display order. */
  useVoidableEntries: (item: TItem | undefined) => VoidableEntry[];
  /** Barcode scanning is catalog-specific; the tab only needs the id it resolves to. */
  renderScanInput: (onItemFound: (itemId: string) => void) => ReactNode;
  /** The caller runs the mutation and calls `reset` once it succeeds. */
  onSubmit: (transactionIds: string[], reason: string, reset: () => void, item: TItem) => void;
  onComplete: () => void;
}

export function BulkVoidTab<TItem extends { id: string; name: string }>({
  items,
  itemOptions,
  isPending,
  useVoidableEntries,
  renderScanInput,
  onSubmit,
  onComplete,
}: BulkVoidTabProps<TItem>) {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const { data: locations = [] } = useLabLocationsQuery();

  const selectedItem = items.find(item => item.id === selectedItemId);
  const entries = useVoidableEntries(selectedItem);

  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  // The Autocomplete renders whatever it is handed, so the narrowing happens here.
  const visibleOptions = useMemo(
    () => filterItemAutocompleteOptions(itemOptions, searchValue),
    [itemOptions, searchValue]
  );

  const toggleEntry = useCallback((id: string) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedEntryIds(new Set());
  }, []);

  const handleItemSelect = useCallback(
    (option: AutocompleteOption) => {
      selectItem(option.value);
      setSearchValue('');
    },
    [selectItem]
  );

  const reset = useCallback(() => {
    setSelectedItemId(undefined);
    setSelectedEntryIds(new Set());
    setReason('');
  }, []);

  const handleSubmit = useCallback(() => {
    const transactionIds = entries
      .filter(entry => selectedEntryIds.has(entry.id))
      .flatMap(entry => entry.transactionIds);
    if (!selectedItem || transactionIds.length === 0 || !reason.trim()) return;
    onSubmit(transactionIds, reason.trim(), reset, selectedItem);
  }, [entries, selectedEntryIds, reason, onSubmit, reset, selectedItem]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 flex-shrink-0 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10" />
            <Autocomplete
              options={visibleOptions}
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handleItemSelect}
              placeholder="Search items..."
              fullWidth
              inputClassName={SEARCH_INPUT_CLASS}
            />
          </div>
          <div className="flex-1">{renderScanInput(selectItem)}</div>
        </div>
        {selectedItem && (
          <p className="text-caption text-muted-foreground">
            {entries.length} voidable transaction{entries.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-card-foreground">{selectedItem.name}</span>
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-1">
          {entries.map(entry => {
            const { icon: Icon, label } = transactionTypeDisplay(entry.type);

            return (
              <label
                key={entry.id}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedEntryIds.has(entry.id)}
                  onChange={() => toggleEntry(entry.id)}
                />
                <Icon size={14} className="flex-shrink-0 text-muted-foreground" />
                <span className="text-caption text-muted-foreground flex-shrink-0">
                  {formatDateForDisplay(entry.createdAt)}
                </span>
                <span className="text-caption font-medium flex-shrink-0">
                  {entry.quantityLabel}
                </span>
                <span className="text-caption text-muted-foreground truncate">
                  {label} · {locationNameMap.get(entry.locationId) ?? entry.locationId}
                  {entry.note ? ` · ${entry.note}` : ''}
                </span>
              </label>
            );
          })}
          {selectedItemId && entries.length === 0 && (
            <p className="text-caption text-muted-foreground italic text-center py-4">
              No voidable transactions
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="relative px-4 pt-3 pb-4 border-t border-line-faint flex-shrink-0 space-y-3">
        <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
        <div>
          <label htmlFor="bulk-void-reason" className={FIELD_LABEL_COMPACT}>
            Reason for voiding *
          </label>
          <Textarea
            id="bulk-void-reason"
            value={reason}
            onValueChange={setReason}
            placeholder="e.g., Entire shipment was returned"
            rows={2}
            resize="none"
            fullWidth
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            {selectedEntryIds.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onComplete}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              disabled={selectedEntryIds.size === 0 || !reason.trim()}
              isLoading={isPending}
              loadingText="Voiding..."
            >
              Void{' '}
              {selectedEntryIds.size > 0
                ? `${selectedEntryIds.size} Transaction${selectedEntryIds.size !== 1 ? 's' : ''}`
                : 'Transactions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
