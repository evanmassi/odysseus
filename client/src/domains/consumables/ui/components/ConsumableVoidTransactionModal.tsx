/**
 * Consumable Void Transaction Modal
 *
 * Confirmation dialog for voiding a stock transaction with a required reason.
 */

import { useState, useEffect } from 'react';

import { Ban } from 'lucide-react';

import { useConsumableLocationsQuery } from '@domains/consumables/hooks';
import { useVoidConsumableTransactionMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ConsumableTransaction } from '@odysseus/shared-schemas';

const TYPE_LABELS: Record<string, string> = {
  received: 'Receive',
  consumed: 'Consumption',
  count_adjustment: 'Count Adjustment',
  disposed: 'Disposal',
};

interface ConsumableVoidTransactionModalProps {
  isOpen: boolean;
  transaction: ConsumableTransaction | null;
  stockUnit?: string;
  onClose: () => void;
}

export function ConsumableVoidTransactionModal({
  isOpen,
  transaction,
  stockUnit,
  onClose,
}: ConsumableVoidTransactionModalProps) {
  const [reason, setReason] = useState('');
  const voidMutation = useVoidConsumableTransactionMutation();
  const { data: locations = [] } = useConsumableLocationsQuery();

  useEffect(() => {
    if (transaction) setReason('');
  }, [transaction]);

  const locationName = transaction
    ? (locations.find(l => l.id === transaction.locationId)?.name ?? transaction.locationId)
    : '';

  const handleVoid = async () => {
    if (!transaction || !reason.trim()) return;
    try {
      await voidMutation.mutateAsync({
        transactionId: transaction.id,
        data: { reason: reason.trim() },
      });
      notifications.success('Transaction voided');
      onClose();
    } catch {
      notifications.error('Failed to void transaction');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Void Transaction"
      icon={<Ban size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      {transaction && (
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">
                {TYPE_LABELS[transaction.type] ?? transaction.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">
                {transaction.quantityChange >= 0 ? '+' : ''}
                {transaction.quantityChange}{' '}
                {pluralizeUnit(stockUnit ?? 'unit', Math.abs(transaction.quantityChange))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{locationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDateForDisplay(transaction.createdAt)}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="void-reason"
              className="text-sm font-medium text-secondary-foreground block mb-1"
            >
              Reason for voiding *
            </label>
            <Textarea
              id="void-reason"
              value={reason}
              onValueChange={setReason}
              placeholder="e.g., Wrong quantity entered, should have been 50 not 500"
              rows={3}
              resize="none"
              fullWidth
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={voidMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleVoid()}
              disabled={!reason.trim()}
              isLoading={voidMutation.isPending}
              loadingText="Voiding..."
            >
              Void Transaction
            </Button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
