/**
 * Supply Bulk Void Tab
 *
 * Binds the shared void list to the supply ledger, where one transaction is one movement.
 */

import { useMemo } from 'react';

import { pluralizeUnit } from '@odysseus/shared-schemas';

import { useSupplyTransactionHistoryQuery } from '@domains/supplies/hooks';
import { useSupplyBulkVoidMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import {
  BulkVoidTab,
  toItemAutocompleteOptions,
  type VoidableEntry,
} from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { useSupplyBarcodeLinker } from './supplyBulkBindings';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyBulkVoidTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

function useSupplyVoidableEntries(item: SupplyItemWithStock | undefined): VoidableEntry[] {
  const { data: transactions = [] } = useSupplyTransactionHistoryQuery(item?.id);

  return useMemo(
    () =>
      transactions
        .filter(txn => !txn.voidedAt && txn.type !== 'void_reversal')
        .map(txn => ({
          id: txn.id,
          transactionIds: [txn.id],
          type: txn.type,
          createdAt: txn.createdAt,
          locationId: txn.locationId,
          quantityLabel: `${txn.quantityChange >= 0 ? '+' : ''}${txn.quantityChange} ${pluralizeUnit(
            item?.stockUnit ?? 'unit',
            Math.abs(txn.quantityChange)
          )}`,
        })),
    [transactions, item?.stockUnit]
  );
}

export function SupplyBulkVoidTab({ items, onComplete }: SupplyBulkVoidTabProps) {
  const bulkVoidMutation = useSupplyBulkVoidMutation();
  const linker = useSupplyBarcodeLinker();

  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkVoidTab<SupplyItemWithStock>
      items={items}
      itemOptions={itemOptions}
      isPending={bulkVoidMutation.isPending}
      useVoidableEntries={useSupplyVoidableEntries}
      renderScanInput={onItemFound => (
        <BarcodeScanInput
          catalog="supply"
          items={items}
          onItemFound={onItemFound}
          onLink={linker.link}
          isLinking={linker.isLinking}
        />
      )}
      onSubmit={(transactionIds, reason, reset) =>
        bulkVoidMutation.mutate(
          { transactionIds, reason },
          {
            onSuccess: result => {
              notifyBulkResult(result, { entityLabel: 'transactions', actionVerb: 'Voided' });
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
