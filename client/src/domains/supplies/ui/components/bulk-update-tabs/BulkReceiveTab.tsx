/**
 * Bulk Receive Tab
 *
 * Order-form style receive with item search and packaging-aware per-row inputs.
 */

import { useState, useMemo, useCallback } from 'react';

import { Search } from 'lucide-react';

import { useSupplyLocationsQuery } from '@domains/supplies/hooks';
import { useSupplyBulkReceiveMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Autocomplete, Button, Input, NubDivider } from '@shared/ui';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import { SupplyBarcodeScanInput } from '../SupplyBarcodeScanInput';

import { BulkItemRow } from './BulkItemRow';
import { SEARCH_INPUT_CLASS, SELECT_LABEL } from './fieldLabelStyle';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface ReceiveRow {
  itemId: string;
  itemName: string;
  quantity: number;
  locationId: string;
  lotNumber: string;
  poNumber: string;
  cost: string;
}

interface BulkReceiveTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

export function BulkReceiveTab({ items, onComplete }: BulkReceiveTabProps) {
  const [rows, setRows] = useState<ReceiveRow[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [lastLocationId, setLastLocationId] = useState('');
  const { data: locations = [] } = useSupplyLocationsQuery();
  const bulkReceiveMutation = useSupplyBulkReceiveMutation();

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
      setRows(prev => [
        ...prev,
        {
          itemId,
          itemName,
          quantity: 0,
          locationId: lastLocationId,
          lotNumber: '',
          poNumber: '',
          cost: '',
        },
      ]);
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

  const updateRow = useCallback(
    (index: number, field: keyof ReceiveRow, value: string | number) => {
      setRows(prev =>
        prev.map((row, i) => {
          if (i !== index) return row;
          const updated = { ...row, [field]: value };
          if (field === 'locationId') setLastLocationId(value as string);
          return updated;
        })
      );
    },
    []
  );

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const items = rows
      .filter(r => r.quantity > 0 && r.locationId)
      .map(r => ({
        itemId: r.itemId,
        locationId: r.locationId,
        quantity: r.quantity,
        lotNumber: r.lotNumber || undefined,
        poNumber: r.poNumber || undefined,
        cost: r.cost ? parseFloat(r.cost) : undefined,
      }));

    if (items.length === 0) return;

    try {
      const result = await bulkReceiveMutation.mutateAsync({ items });
      notifyBulkResult(result, 'items');
      setRows([]);
      onComplete();
    } catch {
      notifications.error('Failed to receive stock');
    }
  }, [rows, bulkReceiveMutation, onComplete]);

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
              Search for items above to add them to this receive order.
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
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className={SELECT_LABEL}>Lot #</span>
                  <Input
                    type="text"
                    value={row.lotNumber}
                    onValueChange={v => updateRow(index, 'lotNumber', v)}
                    size="sm"
                    fullWidth
                  />
                </div>
                <div>
                  <span className={SELECT_LABEL}>PO #</span>
                  <Input
                    type="text"
                    value={row.poNumber}
                    onValueChange={v => updateRow(index, 'poNumber', v)}
                    size="sm"
                    fullWidth
                  />
                </div>
                <div>
                  <span className={SELECT_LABEL}>Cost ($)</span>
                  <Input
                    type="number"
                    value={row.cost}
                    onValueChange={v => updateRow(index, 'cost', v)}
                    size="sm"
                    fullWidth
                  />
                </div>
              </div>
            </BulkItemRow>
          ))}
        </div>
      </ScrollArea>

      <div className="relative flex items-center justify-between px-4 py-3 border-t border-line-faint flex-shrink-0">
        <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
        <span className="text-caption text-muted-foreground">
          {validRowCount} item{validRowCount !== 1 ? 's' : ''} to receive
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onComplete}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={validRowCount === 0}
            isLoading={bulkReceiveMutation.isPending}
            loadingText="Receiving..."
          >
            Receive All
          </Button>
        </div>
      </div>
    </div>
  );
}
