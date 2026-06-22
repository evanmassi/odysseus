/**
 * Bulk Void Tab
 *
 * Select a item, view its transactions, check which to void, and submit with a shared reason.
 */

import { useState, useMemo, useCallback } from 'react';

import { PackagePlus, PackageMinus, ClipboardCheck, Trash2, Search } from 'lucide-react';

import { useSupplyLocationsQuery, useSupplyTransactionHistoryQuery } from '@domains/supplies/hooks';
import { useSupplyBulkVoidMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Autocomplete, Button, Checkbox, NubDivider } from '@shared/ui';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyBarcodeScanInput } from '../SupplyBarcodeScanInput';

import { SEARCH_INPUT_CLASS, SELECT_LABEL } from './fieldLabelStyle';

import type { SupplyItemWithStock, SupplyTransaction } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';

const TYPE_ICONS: Record<string, typeof PackagePlus> = {
  received: PackagePlus,
  issued: PackageMinus,
  count_adjustment: ClipboardCheck,
  disposed: Trash2,
};

const TYPE_LABELS: Record<string, string> = {
  received: 'Received',
  issued: 'Issued',
  count_adjustment: 'Count Adj.',
  disposed: 'Disposed',
};

interface BulkVoidTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

export function BulkVoidTab({ items, onComplete }: BulkVoidTabProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const { data: locations = [] } = useSupplyLocationsQuery();
  const { data: allTransactions = [] } = useSupplyTransactionHistoryQuery(selectedItemId);
  const bulkVoidMutation = useSupplyBulkVoidMutation();

  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  const eligibleTransactions = useMemo(
    () =>
      allTransactions.filter((t: SupplyTransaction) => !t.voidedAt && t.type !== 'void_reversal'),
    [allTransactions]
  );

  const selectedItem = items.find(p => p.id === selectedItemId);

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

  const toggleTransaction = useCallback((id: string) => {
    setSelectedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedTxnIds(new Set());
  }, []);

  const handleItemSelect = useCallback(
    (option: AutocompleteOption) => {
      selectItem(String(option.value));
      setSearchValue('');
    },
    [selectItem]
  );

  const handleScanItem = useCallback(
    (itemId: string) => {
      selectItem(itemId);
    },
    [selectItem]
  );

  const handleSubmit = useCallback(async () => {
    if (selectedTxnIds.size === 0 || !reason.trim()) return;
    try {
      const result = await bulkVoidMutation.mutateAsync({
        transactionIds: [...selectedTxnIds],
        reason: reason.trim(),
      });
      notifyBulkResult(result, 'transactions');
      setSelectedItemId(undefined);
      setSelectedTxnIds(new Set());
      setReason('');
      onComplete();
    } catch {
      notifications.error('Failed to void transactions');
    }
  }, [selectedTxnIds, reason, bulkVoidMutation, onComplete]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 flex-shrink-0 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10" />
            <Autocomplete
              options={itemOptions}
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handleItemSelect}
              placeholder="Search items..."
              fullWidth
              inputClassName={SEARCH_INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <SupplyBarcodeScanInput items={items} onItemFound={handleScanItem} />
          </div>
        </div>
        {selectedItem && (
          <p className="text-caption text-muted-foreground">
            {eligibleTransactions.length} voidable transaction
            {eligibleTransactions.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-card-foreground">{selectedItem.name}</span>
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-1">
          {eligibleTransactions.map((txn: SupplyTransaction) => {
            const Icon = TYPE_ICONS[txn.type] ?? PackagePlus;
            const unit = pluralizeUnit(
              selectedItem?.stockUnit ?? 'unit',
              Math.abs(txn.quantityChange)
            );
            const qty =
              txn.quantityChange >= 0 ? `+${txn.quantityChange}` : String(txn.quantityChange);

            return (
              // eslint-disable-next-line jsx-a11y/label-has-associated-control -- Checkbox is the control
              <label
                key={txn.id}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedTxnIds.has(txn.id)}
                  onChange={() => toggleTransaction(txn.id)}
                />
                <Icon size={14} className="flex-shrink-0 text-muted-foreground" />
                <span className="text-caption text-muted-foreground flex-shrink-0">
                  {formatDateForDisplay(txn.createdAt)}
                </span>
                <span className="text-caption font-medium flex-shrink-0">
                  {qty} {unit}
                </span>
                <span className="text-caption text-muted-foreground truncate">
                  {TYPE_LABELS[txn.type] ?? txn.type} ·{' '}
                  {locationNameMap.get(txn.locationId) ?? txn.locationId}
                </span>
              </label>
            );
          })}
          {selectedItemId && eligibleTransactions.length === 0 && (
            <p className="text-caption text-muted-foreground italic text-center py-4">
              No voidable transactions
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="relative px-4 pt-3 pb-4 border-t border-line-faint flex-shrink-0 space-y-3">
        <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
        <div>
          <label htmlFor="bulk-void-reason" className={SELECT_LABEL}>
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
          <span className="text-caption text-muted-foreground">{selectedTxnIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onComplete}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleSubmit()}
              disabled={selectedTxnIds.size === 0 || !reason.trim()}
              isLoading={bulkVoidMutation.isPending}
              loadingText="Voiding..."
            >
              Void{' '}
              {selectedTxnIds.size > 0
                ? `${selectedTxnIds.size} Transaction${selectedTxnIds.size !== 1 ? 's' : ''}`
                : 'Transactions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
