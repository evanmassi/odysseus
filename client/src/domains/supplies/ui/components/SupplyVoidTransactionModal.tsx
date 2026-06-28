/**
 * Supply Void Transaction Modal
 *
 * Confirmation dialog for voiding a stock transaction with a required reason.
 * Supports "Void & Replace" to immediately open a pre-filled replacement form.
 */

import { useState, useEffect } from 'react';

import { Ban } from 'lucide-react';

import { useSupplyLocationsQuery } from '@domains/supplies/hooks';
import { useVoidSupplyTransactionMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { formatDateForDisplay, normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyTransaction } from '@odysseus/shared-schemas';

const TYPE_LABELS: Record<string, string> = {
  received: 'Receive',
  issued: 'Consumption',
  count_adjustment: 'Count Adjustment',
  disposed: 'Disposal',
};

interface SupplyVoidTransactionModalProps {
  isOpen: boolean;
  transaction: SupplyTransaction | null;
  stockUnit?: string;
  onClose: () => void;
  onVoidAndReplace?: (
    itemId: string,
    initialTab: 'received' | 'issued' | 'count' | 'disposed',
    prefill: TransactionPrefill
  ) => void;
}

export function SupplyVoidTransactionModal({
  isOpen,
  transaction,
  stockUnit,
  onClose,
  onVoidAndReplace,
}: SupplyVoidTransactionModalProps) {
  const [reason, setReason] = useState('');
  const voidMutation = useVoidSupplyTransactionMutation();
  const { data: locations = [] } = useSupplyLocationsQuery();

  useEffect(() => {
    if (transaction) setReason('');
  }, [transaction]);

  const locationName = transaction
    ? (locations.find(l => l.id === transaction.locationId)?.name ?? transaction.locationId)
    : '';

  const handleVoid = async (replace: boolean) => {
    if (!transaction || !reason.trim()) return;
    try {
      await voidMutation.mutateAsync({
        transactionId: transaction.id,
        data: { reason: reason.trim() },
      });
      notifications.success('Transaction voided');
      onClose();

      if (replace && onVoidAndReplace) {
        const initialTab =
          transaction.type === 'count_adjustment'
            ? 'count'
            : (transaction.type as 'received' | 'issued' | 'disposed');
        onVoidAndReplace(transaction.itemId, initialTab, {
          locationId: transaction.locationId,
          quantity: Math.abs(transaction.quantityChange),
          lotNumber: transaction.lotNumber,
          expirationDate: normalizeDateString(transaction.expirationDate),
          poNumber: transaction.poNumber,
          cost: transaction.cost,
          notes: transaction.notes,
        });
      }
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
          <div className="bg-muted rounded-md p-3 space-y-1 text-body-sm">
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
              className="text-body-sm font-medium text-secondary-foreground block mb-1"
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
            {onVoidAndReplace && (
              <Button
                variant="secondary"
                onClick={() => void handleVoid(true)}
                disabled={!reason.trim()}
                isLoading={voidMutation.isPending}
              >
                Void & Replace
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => void handleVoid(false)}
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
