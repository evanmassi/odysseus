/**
 * Reagent Void Transaction Modal
 *
 * Reverses a stock movement with a required reason. A movement that drew across
 * several lots is voided as one action, so its ledger rows can't be half-undone.
 */

import { useState } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';
import { Ban } from 'lucide-react';

import {
  useReagentBulkVoidMutation,
  useVoidReagentTransactionMutation,
} from '@domains/reagents/hooks';
import { Button } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { transactionTypeDisplay } from '@shared/ui/components/inventory';
import { BaseModal } from '@shared/ui/components/overlays';
import { Textarea } from '@shared/ui/primitives/textarea/Textarea';
import { formatDateForDisplay, normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type { TransactionMode, TransactionPrefill } from './ReagentTransactionForm';
import type { TransactionGroup } from '@domains/reagents/utils/reagentTransactionGroups';
import type { ReagentLot } from '@odysseus/shared-schemas';

interface ReagentVoidTransactionModalProps {
  group: TransactionGroup;
  lotMap: Map<string, ReagentLot>;
  locationName: string;
  stockUnit?: string;
  onClose: () => void;
  onVoidAndReplace?: (
    itemId: string,
    initialTab: TransactionMode,
    prefill: TransactionPrefill
  ) => void;
}

export function ReagentVoidTransactionModal({
  group,
  lotMap,
  locationName,
  stockUnit,
  onClose,
  onVoidAndReplace,
}: ReagentVoidTransactionModalProps) {
  const [reason, setReason] = useState('');
  const voidMutation = useVoidReagentTransactionMutation();
  const bulkVoidMutation = useReagentBulkVoidMutation();

  const first = group.transactions[0];
  const pending = group.transactions.filter(txn => !txn.voidedAt);
  const amount = stockUnit
    ? formatQuantity(Math.abs(group.quantityChange), stockUnit)
    : String(Math.abs(group.quantityChange));

  const replace = (voidedAll: boolean) => {
    if (!voidedAll || !onVoidAndReplace) return;
    const lot = first.lotId ? lotMap.get(first.lotId) : undefined;
    const initialTab: TransactionMode =
      group.type === 'count_adjustment' ? 'count' : (group.type as TransactionMode);

    onVoidAndReplace(first.itemId, initialTab, {
      locationId: group.locationId,
      quantity: Math.abs(group.quantityChange),
      lotNumber: lot?.lotNumber,
      expirationDate: normalizeDateString(lot?.expirationDate),
      poNumber: first.poNumber,
      cost: first.cost,
      notes: first.notes,
    });
  };

  const handleVoid = (andReplace: boolean) => {
    if (!reason.trim()) return;

    if (pending.length === 1) {
      voidMutation.mutate(
        { transactionId: pending[0].id, data: { reason: reason.trim() } },
        {
          onSuccess: () => {
            notifications.success('Transaction voided');
            onClose();
            replace(andReplace);
          },
        }
      );
      return;
    }

    bulkVoidMutation.mutate(
      {
        itemId: first.itemId,
        data: { transactionIds: pending.map(txn => txn.id), reason: reason.trim() },
      },
      {
        onSuccess: result => {
          if (result.failed.length > 0) {
            notifications.warning(
              `Voided ${result.succeeded.length} of ${pending.length} ledger rows — ${result.failed.length} could not be reversed`
            );
          } else {
            notifications.success('Transaction voided');
          }
          onClose();
          replace(andReplace && result.failed.length === 0);
        },
      }
    );
  };

  const isPending = voidMutation.isPending || bulkVoidMutation.isPending;

  return (
    <BaseModal isOpen title="Void Transaction" icon={<Ban size={24} />} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="space-y-1 rounded-md bg-muted p-3 text-body-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{transactionTypeDisplay(group.type).label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity</span>
            <span className="font-medium">
              {group.quantityChange >= 0 ? '+' : '−'}
              {amount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{locationName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formatDateForDisplay(group.createdAt)}</span>
          </div>
          {pending.length > 1 && (
            <p className="pt-1 text-caption text-muted-foreground">
              This movement drew from {pending.length} lots. Voiding returns the quantity to each.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reagent-void-reason" className={FIELD_LABEL_STANDARD}>
            Reason for voiding *
          </label>
          <Textarea
            id="reagent-void-reason"
            value={reason}
            onValueChange={setReason}
            placeholder="e.g., Wrong quantity entered, should have been 50 not 500"
            rows={3}
            resize="none"
            fullWidth
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {onVoidAndReplace && (
            <Button
              variant="secondary"
              onClick={() => handleVoid(true)}
              disabled={!reason.trim()}
              isLoading={isPending}
            >
              Void &amp; Replace
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => handleVoid(false)}
            disabled={!reason.trim()}
            isLoading={isPending}
            loadingText="Voiding..."
          >
            Void Transaction
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
