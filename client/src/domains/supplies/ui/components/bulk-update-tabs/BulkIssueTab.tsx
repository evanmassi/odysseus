/**
 * Bulk Issue Tab
 *
 * Order-form style issuance with item search and packaging-aware per-row inputs.
 */

import { useState, useMemo, useCallback } from 'react';

import { Search } from 'lucide-react';

import { useSupplyLocationsQuery } from '@domains/supplies/hooks';
import { useSupplyBulkIssueMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Autocomplete, Button, NubDivider } from '@shared/ui';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import { SupplyBarcodeScanInput } from '../SupplyBarcodeScanInput';

import { BulkItemRow } from './BulkItemRow';
import { SEARCH_INPUT_CLASS } from './fieldLabelStyle';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface IssueRow {
  itemId: string;
  itemName: string;
  quantity: number;
  locationId: string;
}

interface BulkIssueTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

export function BulkIssueTab({ items, onComplete }: BulkIssueTabProps) {
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [lastLocationId, setLastLocationId] = useState('');
  const { data: locations = [] } = useSupplyLocationsQuery();
  const bulkIssueMutation = useSupplyBulkIssueMutation();

  const locationOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select...' },
      ...locations.map(l => ({ value: l.id, label: l.name })),
    ],
    [locations]
  );

  const itemOptions: AutocompleteOption[] = useMemo(
    () =>
      items
        .filter(p => p.status === 'active')
        .map(p => ({
          value: p.id,
          label: p.name,
          secondary: [p.manufacturer, p.catalogNumber].filter(Boolean).join(' · '),
        })),
    [items]
  );

  const addItem = useCallback(
    (itemId: string, itemName: string) => {
      setRows(prev => [...prev, { itemId, itemName, quantity: 0, locationId: lastLocationId }]);
    },
    [lastLocationId]
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
      const item = items.find(p => p.id === itemId);
      if (item) addItem(item.id, item.name);
    },
    [items, addItem]
  );

  const updateRow = useCallback((index: number, field: keyof IssueRow, value: string | number) => {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        if (field === 'locationId') setLastLocationId(value as string);
        return updated;
      })
    );
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const items = rows
      .filter(r => r.quantity > 0 && r.locationId)
      .map(r => ({ itemId: r.itemId, locationId: r.locationId, quantity: r.quantity }));

    if (items.length === 0) return;

    try {
      const result = await bulkIssueMutation.mutateAsync({ items });
      notifyBulkResult(result, 'items');
      setRows([]);
      onComplete();
    } catch {
      notifications.error('Failed to record issuance');
    }
  }, [rows, bulkIssueMutation, onComplete]);

  const validRowCount = rows.filter(r => r.quantity > 0 && r.locationId).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 flex-shrink-0 flex items-start gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10" />
          <Autocomplete
            options={itemOptions}
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleAddItem}
            placeholder="Search items..."
            fullWidth
            inputClassName={SEARCH_INPUT_CLASS}
          />
        </div>
        <div className="flex-1">
          <SupplyBarcodeScanInput items={items} onItemFound={handleScanItem} />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-2">
          {rows.length === 0 && (
            <p className="text-body-sm text-muted-foreground text-center py-8">
              Search for items above to add them.
            </p>
          )}

          {rows.map((row, index) => (
            <BulkItemRow
              key={`${row.itemId}-${index}`}
              itemId={row.itemId}
              itemName={row.itemName}
              locationId={row.locationId}
              locationOptions={locationOptions}
              onLocationChange={v => updateRow(index, 'locationId', v)}
              onQuantityChange={v => updateRow(index, 'quantity', v)}
              onRemove={() => removeRow(index)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="relative flex items-center justify-between px-4 py-3 border-t border-line-faint flex-shrink-0">
        <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
        <span className="text-caption text-muted-foreground">
          {validRowCount} item{validRowCount !== 1 ? 's' : ''} to issue
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onComplete}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={validRowCount === 0}
            isLoading={bulkIssueMutation.isPending}
            loadingText="Recording..."
          >
            Issue All
          </Button>
        </div>
      </div>
    </div>
  );
}
