/**
 * Consumable Bulk Void Modal
 *
 * Select a product, view its recent transactions, check which to void, and submit
 * with a shared reason. Follows the bulk consume modal pattern.
 */

import { useState, useMemo, useCallback } from 'react';

import { Ban, PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react';

import {
  useConsumableLocationsQuery,
  useConsumableTransactionHistoryQuery,
} from '@domains/consumables/hooks';
import { useConsumableBulkVoidMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Autocomplete, Button, Checkbox } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ConsumableProductWithStock, ConsumableTransaction } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';

const TYPE_ICONS: Record<string, typeof PackagePlus> = {
  received: PackagePlus,
  consumed: PackageMinus,
  count_adjustment: ClipboardCheck,
  disposed: Trash2,
};

const TYPE_LABELS: Record<string, string> = {
  received: 'Received',
  consumed: 'Consumed',
  count_adjustment: 'Count Adj.',
  disposed: 'Disposed',
};

interface ConsumableBulkVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ConsumableProductWithStock[];
}

export function ConsumableBulkVoidModal({
  isOpen,
  onClose,
  products,
}: ConsumableBulkVoidModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const { data: locations = [] } = useConsumableLocationsQuery();
  const { data: allTransactions = [] } = useConsumableTransactionHistoryQuery(selectedProductId);
  const bulkVoidMutation = useConsumableBulkVoidMutation();

  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  const eligibleTransactions = useMemo(
    () =>
      allTransactions.filter(
        (t: ConsumableTransaction) => !t.voidedAt && t.type !== 'void_reversal'
      ),
    [allTransactions]
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const productOptions: AutocompleteOption[] = useMemo(
    () =>
      products
        .filter(p => p.status === 'active')
        .map(p => ({
          value: p.id,
          label: p.name,
          secondary: [p.manufacturer, p.catalogNumber].filter(Boolean).join(' · '),
        })),
    [products]
  );

  const toggleTransaction = useCallback((id: string) => {
    setSelectedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleProductSelect = useCallback((option: AutocompleteOption) => {
    setSelectedProductId(String(option.value));
    setSelectedTxnIds(new Set());
    setSearchValue('');
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProductId(undefined);
    setSelectedTxnIds(new Set());
    setReason('');
    setSearchValue('');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (selectedTxnIds.size === 0 || !reason.trim()) return;
    try {
      const result = await bulkVoidMutation.mutateAsync({
        transactionIds: [...selectedTxnIds],
        reason: reason.trim(),
      });
      notifyBulkResult(result, 'transactions');
      handleClose();
    } catch {
      notifications.error('Failed to void transactions');
    }
  }, [selectedTxnIds, reason, bulkVoidMutation, handleClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Bulk Void Transactions"
      icon={<Ban size={24} />}
      onClose={handleClose}
      size="lg"
      fixedHeight
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="px-4 pb-3 flex-shrink-0 space-y-3">
          <Autocomplete
            options={productOptions}
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleProductSelect}
            placeholder="Search for a product..."
            fullWidth
          />

          {selectedProduct && (
            <p className="text-xs text-muted-foreground">
              {eligibleTransactions.length} voidable transaction
              {eligibleTransactions.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-card-foreground">{selectedProduct.name}</span>
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 space-y-1">
            {eligibleTransactions.map((txn: ConsumableTransaction) => {
              const Icon = TYPE_ICONS[txn.type] ?? PackagePlus;
              const unit = pluralizeUnit(
                selectedProduct?.stockUnit ?? 'unit',
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
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDateForDisplay(txn.createdAt)}
                  </span>
                  <span className="text-xs font-medium flex-shrink-0">
                    {qty} {unit}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {TYPE_LABELS[txn.type] ?? txn.type} ·{' '}
                    {locationNameMap.get(txn.locationId) ?? txn.locationId}
                  </span>
                </label>
              );
            })}
            {selectedProductId && eligibleTransactions.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                No voidable transactions
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 pt-3 pb-4 border-t border-border flex-shrink-0 space-y-3">
          <div>
            <label
              htmlFor="bulk-void-reason"
              className="text-sm font-medium text-secondary-foreground block mb-1"
            >
              Reason for voiding *
            </label>
            <Textarea
              id="bulk-void-reason"
              value={reason}
              onValueChange={setReason}
              placeholder="e.g., Entire shipment was returned, voiding all receive entries"
              rows={2}
              resize="none"
              fullWidth
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{selectedTxnIds.size} selected</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
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
    </BaseModal>
  );
}
