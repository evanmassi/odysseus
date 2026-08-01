/**
 * Bulk Receive Tab
 *
 * Order-form style receive with item search and packaging-aware per-row inputs.
 */

import { useState, useMemo, useCallback, useRef } from 'react';

import { Search } from 'lucide-react';

import { useLocationsQuery } from '@domains/lab-management';
import { useSupplyBulkReceiveMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { toItemAutocompleteOptions } from '@domains/supplies/utils/itemAutocompleteOptions';
import {
  Autocomplete,
  buildHierarchyOptions,
  Button,
  Input,
  NubDivider,
  withPlaceholder,
} from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { SupplyBarcodeScanInput } from '../SupplyBarcodeScanInput';

import { BulkItemRow } from './BulkItemRow';
import { SEARCH_INPUT_CLASS } from './searchInputStyle';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';

interface ReceiveRow {
  rowId: string;
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
  const nextRowId = useRef(0);
  const { data: locations = [] } = useLocationsQuery();
  const bulkReceiveMutation = useSupplyBulkReceiveMutation();

  const locationOptions = useMemo(
    () => withPlaceholder('Select...', buildHierarchyOptions(locations)),
    [locations]
  );

  const itemOptions: AutocompleteOption[] = useMemo(
    () => toItemAutocompleteOptions(items),
    [items]
  );

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
    (rowId: string, field: keyof ReceiveRow, value: string | number) => {
      setRows(prev => prev.map(row => (row.rowId === rowId ? { ...row, [field]: value } : row)));
    },
    []
  );

  const updateQuantity = useCallback((rowId: string, quantity: number) => {
    setRows(prev => prev.map(row => (row.rowId === rowId ? { ...row, quantity } : row)));
  }, []);

  const updateLocation = useCallback(
    (rowId: string, locationId: string) => {
      setLastLocationId(locationId);
      updateRow(rowId, 'locationId', locationId);
    },
    [updateRow]
  );

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(row => row.rowId !== rowId));
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

    bulkReceiveMutation.mutate(
      { items },
      {
        onSuccess: result => {
          notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Received' });
          setRows([]);
          onComplete();
        },
      }
    );
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
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Lot #</span>
                  <Input
                    type="text"
                    value={row.lotNumber}
                    onValueChange={v => updateRow(row.rowId, 'lotNumber', v)}
                    size="sm"
                    fullWidth
                  />
                </div>
                <div>
                  <span className={FIELD_LABEL_COMPACT}>PO #</span>
                  <Input
                    type="text"
                    value={row.poNumber}
                    onValueChange={v => updateRow(row.rowId, 'poNumber', v)}
                    size="sm"
                    fullWidth
                  />
                </div>
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Cost ($)</span>
                  <Input
                    type="number"
                    value={row.cost}
                    onValueChange={v => updateRow(row.rowId, 'cost', v)}
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
