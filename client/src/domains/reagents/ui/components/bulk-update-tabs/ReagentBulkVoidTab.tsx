/**
 * Reagent Bulk Void Tab
 *
 * Binds the shared void list to the reagent ledger, where a FEFO draw writes one row per lot.
 * A tick owns the whole movement, so an issue cannot be half-undone from here either.
 */

import { useMemo } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';

import { useReagentTransactionHistoryQuery } from '@domains/reagents/hooks';
import { useReagentBulkVoidMutation } from '@domains/reagents/hooks/useReagentMutations';
import { groupTransactions } from '@domains/reagents/utils/reagentTransactionGroups';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import {
  BulkVoidTab,
  toItemAutocompleteOptions,
  type VoidableEntry,
} from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { useReagentBarcodeLinker } from './reagentBulkBindings';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentBulkVoidTabProps {
  items: ReagentItemWithStock[];
  onComplete: () => void;
}

function useReagentVoidableEntries(item: ReagentItemWithStock | undefined): VoidableEntry[] {
  const { data: transactions = [] } = useReagentTransactionHistoryQuery(item?.id);

  return useMemo(() => {
    const stockUnit = item?.stockUnit;

    return groupTransactions(transactions)
      .filter(group => group.type !== 'void_reversal')
      .map(group => {
        const pending = group.transactions.filter(txn => !txn.voidedAt);
        const quantityChange = pending.reduce((sum, txn) => sum + txn.quantityChange, 0);
        const amount = stockUnit
          ? formatQuantity(Math.abs(quantityChange), stockUnit)
          : String(Math.abs(quantityChange));
        const notes = [
          pending.length > 1 ? `across ${pending.length} lots` : undefined,
          group.voidedCount > 0 ? `${group.voidedCount} already voided` : undefined,
        ].filter(Boolean);

        return {
          id: group.id,
          transactionIds: pending.map(txn => txn.id),
          type: group.type,
          createdAt: group.createdAt,
          locationId: group.locationId,
          quantityLabel: `${quantityChange >= 0 ? '+' : '−'}${amount}`,
          note: notes.length > 0 ? notes.join(' · ') : undefined,
        };
      })
      .filter(entry => entry.transactionIds.length > 0);
  }, [transactions, item?.stockUnit]);
}

export function ReagentBulkVoidTab({ items, onComplete }: ReagentBulkVoidTabProps) {
  const bulkVoidMutation = useReagentBulkVoidMutation();
  const linker = useReagentBarcodeLinker();

  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkVoidTab<ReagentItemWithStock>
      items={items}
      itemOptions={itemOptions}
      isPending={bulkVoidMutation.isPending}
      useVoidableEntries={useReagentVoidableEntries}
      renderScanInput={onItemFound => (
        <BarcodeScanInput
          catalog="reagent"
          items={items}
          onItemFound={onItemFound}
          onLink={linker.link}
          isLinking={linker.isLinking}
        />
      )}
      onSubmit={(transactionIds, reason, reset, item) =>
        bulkVoidMutation.mutate(
          { itemId: item.id, data: { transactionIds, reason } },
          {
            onSuccess: result => {
              notifyBulkResult(result, { entityLabel: 'ledger rows', actionVerb: 'Voided' });
              reset();
              onComplete();
            },
          }
        )
      }
      onComplete={onComplete}
    />
  );
}
