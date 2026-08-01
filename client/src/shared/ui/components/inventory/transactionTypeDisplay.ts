/**
 * Transaction Type Display
 *
 * One icon, tone and name per stock-ledger type, so a movement reads the same wherever it is
 * shown — the timeline, the void dialog, the bulk void list. Held apart from the transaction
 * form's wording, which names the action you are about to take ("Receive") rather than the
 * record you are looking at ("Received").
 */

import { ClipboardCheck, PackageMinus, PackagePlus, Trash2, Undo2 } from 'lucide-react';

interface TransactionTypeDisplay {
  icon: typeof PackagePlus;
  color: string;
  label: string;
}

const TRANSACTION_TYPE_DISPLAY: Record<string, TransactionTypeDisplay> = {
  received: { icon: PackagePlus, color: 'text-success-text', label: 'Received' },
  issued: { icon: PackageMinus, color: 'text-warning-text', label: 'Issued' },
  count_adjustment: { icon: ClipboardCheck, color: 'text-primary', label: 'Count adjustment' },
  disposed: { icon: Trash2, color: 'text-danger-text', label: 'Disposed' },
  void_reversal: { icon: Undo2, color: 'text-muted-foreground', label: 'Void reversal' },
};

/** Falls back to the receipt treatment, matching what every caller did with its own map. */
export function transactionTypeDisplay(type: string): TransactionTypeDisplay {
  return TRANSACTION_TYPE_DISPLAY[type] ?? TRANSACTION_TYPE_DISPLAY['received'];
}
