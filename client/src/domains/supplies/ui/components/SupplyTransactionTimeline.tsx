/**
 * Supply Transaction Timeline
 *
 * Chronological list of stock transactions with collapsible details,
 * type-specific color coding, voided state display, and void action.
 */

import { useState, useMemo } from 'react';

import { isAdminRole, pluralizeUnit } from '@odysseus/shared-schemas';
import { ChevronRight, Ban } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useLocationsQuery } from '@domains/lab-management';
import { Button, Tooltip } from '@shared/ui';
import { transactionTypeDisplay } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';

import { SupplyVoidTransactionModal } from './SupplyVoidTransactionModal';

import type { TransactionMode, TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyTransaction } from '@odysseus/shared-schemas';

interface SupplyTransactionTimelineProps {
  transactions: SupplyTransaction[];
  stockUnit?: string;
  onVoidAndReplace?: (
    itemId: string,
    initialTab: TransactionMode,
    prefill: TransactionPrefill
  ) => void;
}

function TxnDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-body-sm text-card-foreground/85">
        {value}
      </span>
    </div>
  );
}

export function SupplyTransactionTimeline({
  transactions,
  stockUnit,
  onVoidAndReplace,
}: SupplyTransactionTimelineProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const { data: locations = [] } = useLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const [voidingTransaction, setVoidingTransaction] = useState<SupplyTransaction | null>(null);

  if (transactions.length === 0) {
    return <p className="text-body-sm italic text-card-foreground/30">No transactions recorded</p>;
  }

  return (
    <>
      <div className="space-y-0.5">
        {transactions.map(txn => (
          <TransactionEntry
            key={txn.id}
            transaction={txn}
            locationName={locationNameMap.get(txn.locationId) ?? txn.locationId}
            stockUnit={stockUnit}
            isAdmin={isAdmin}
            onVoid={setVoidingTransaction}
          />
        ))}
      </div>

      <SupplyVoidTransactionModal
        isOpen={!!voidingTransaction}
        transaction={voidingTransaction}
        stockUnit={stockUnit}
        onClose={() => setVoidingTransaction(null)}
        onVoidAndReplace={onVoidAndReplace}
      />
    </>
  );
}

function TransactionEntry({
  transaction,
  locationName,
  stockUnit,
  isAdmin,
  onVoid,
}: {
  transaction: SupplyTransaction;
  locationName: string;
  stockUnit?: string;
  isAdmin: boolean;
  onVoid: (txn: SupplyTransaction) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isVoided = !!transaction.voidedAt;
  const isReversal = transaction.type === 'void_reversal';
  const canVoid = isAdmin && !isVoided && !isReversal;

  const config = transactionTypeDisplay(transaction.type);
  const Icon = config.icon;
  const unit = pluralizeUnit(stockUnit ?? 'unit', Math.abs(transaction.quantityChange));
  const quantityDisplay =
    transaction.quantityChange >= 0
      ? `+${transaction.quantityChange}`
      : String(transaction.quantityChange);

  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean truthiness check */
  const hasDetails = !!(
    transaction.lotNumber ||
    transaction.poNumber ||
    transaction.expirationDate ||
    transaction.cost !== undefined ||
    transaction.notes ||
    transaction.voidReason
  );
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  return (
    <div className={isVoided ? 'opacity-60' : ''}>
      <div
        className="group flex cursor-pointer items-center gap-2 py-1 text-body-sm"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        onKeyDown={e => {
          if (e.key === 'Enter' && hasDetails) setIsExpanded(!isExpanded);
        }}
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
      >
        <ChevronRight
          size={12}
          className={`flex-shrink-0 text-card-foreground/40 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasDetails ? 'invisible' : ''}`}
        />
        <Icon size={14} className={`flex-shrink-0 ${config.color}`} />
        <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-foreground">
          {formatDateForDisplay(transaction.createdAt)}
        </span>
        {isVoided && (
          <Chip color="danger" size="xs">
            Voided
          </Chip>
        )}
        <span aria-hidden className="text-foreground/30">
          {'//'}
        </span>
        <span
          className={`whitespace-nowrap text-body-sm font-semibold ${config.color} ${isVoided ? 'line-through' : ''}`}
        >
          {quantityDisplay} {unit}
        </span>
        <span aria-hidden className="text-foreground/30">
          {'//'}
        </span>
        <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
          {locationName}
        </span>
        {canVoid && (
          <div
            className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="toolbar"
          >
            <Tooltip content="Void transaction" side="left">
              <Button variant="ghost-danger" size="xs" iconOnly onClick={() => onVoid(transaction)}>
                <Ban className="h-3 w-3" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {isExpanded && hasDetails && (
        <div className="mb-1.5 ml-[18px] space-y-1 border-l border-line-soft pl-3">
          {transaction.lotNumber && <TxnDetail label="Lot #" value={transaction.lotNumber} />}
          {transaction.poNumber && <TxnDetail label="PO #" value={transaction.poNumber} />}
          {transaction.cost !== undefined && (
            <TxnDetail label="Cost" value={formatCurrency(transaction.cost) ?? '—'} />
          )}
          {transaction.expirationDate && (
            <TxnDetail label="Expires" value={formatDateForDisplay(transaction.expirationDate)} />
          )}
          {transaction.voidReason && (
            <TxnDetail label="Void Reason" value={transaction.voidReason} />
          )}
          {transaction.notes && <TxnDetail label="Notes" value={transaction.notes} />}
        </div>
      )}
    </div>
  );
}
