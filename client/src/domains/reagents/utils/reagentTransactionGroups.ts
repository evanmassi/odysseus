/**
 * Reagent Transaction Grouping
 *
 * Collapses the ledger rows a single stock movement writes back into that movement:
 * a FEFO issue records one row per lot drawn, and the user performed one action.
 */

import type { ReagentTransaction } from '@odysseus/shared-schemas';

export interface TransactionGroup {
  id: string;
  type: string;
  createdAt: Date | string;
  locationId: string;
  quantityChange: number;
  transactions: ReagentTransaction[];
  voidedCount: number;
}

/** One row per lot drawn shares a timestamp, type and location — that tuple is the action. */
export function groupTransactions(transactions: ReagentTransaction[]): TransactionGroup[] {
  const movementKey = (txn: ReagentTransaction) =>
    `${txn.type}|${new Date(txn.createdAt).toISOString()}|${txn.locationId}`;

  // Reversals are written one DB transaction each, so they never share a timestamp with
  // their siblings. They group by the movement they undo, mirroring it row for row.
  const keyByTransactionId = new Map<string, string>();
  for (const txn of transactions) {
    if (txn.type !== 'void_reversal') keyByTransactionId.set(txn.id, movementKey(txn));
  }

  const groups = new Map<string, TransactionGroup>();

  for (const txn of transactions) {
    const reversedKey = txn.relatedTransactionId
      ? keyByTransactionId.get(txn.relatedTransactionId)
      : undefined;
    const key = reversedKey ? `void_reversal|${reversedKey}` : movementKey(txn);
    const existing = groups.get(key);

    if (existing) {
      existing.transactions.push(txn);
      existing.quantityChange += txn.quantityChange;
      if (txn.voidedAt) existing.voidedCount += 1;
      continue;
    }

    groups.set(key, {
      id: txn.id,
      type: txn.type,
      createdAt: txn.createdAt,
      locationId: txn.locationId,
      quantityChange: txn.quantityChange,
      transactions: [txn],
      voidedCount: txn.voidedAt ? 1 : 0,
    });
  }

  return [...groups.values()];
}
