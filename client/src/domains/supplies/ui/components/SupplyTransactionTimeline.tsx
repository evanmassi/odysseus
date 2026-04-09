/**
 * Supply Transaction Timeline
 *
 * Chronological list of stock transactions with collapsible details,
 * type-specific color coding, voided state display, and void action.
 */

import { useState, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  ChevronRight,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  Trash2,
  Undo2,
  Ban,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useSupplyLocationsQuery } from '@domains/supplies/hooks';
import { Button, InfoField, Tooltip } from '@shared/ui';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyVoidTransactionModal } from './SupplyVoidTransactionModal';

import type { TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyTransaction } from '@odysseus/shared-schemas';

const TYPE_CONFIG: Record<string, { icon: typeof PackagePlus; color: string }> = {
  received: { icon: PackagePlus, color: 'text-success-text' },
  issued: { icon: PackageMinus, color: 'text-warning-text' },
  count_adjustment: { icon: ClipboardCheck, color: 'text-primary' },
  disposed: { icon: Trash2, color: 'text-danger-text' },
  void_reversal: { icon: Undo2, color: 'text-muted-foreground' },
};

interface SupplyTransactionTimelineProps {
  transactions: SupplyTransaction[];
  stockUnit?: string;
  onVoidAndReplace?: (
    productId: string,
    initialTab: 'received' | 'issued' | 'count' | 'disposed',
    prefill: TransactionPrefill
  ) => void;
}

export function SupplyTransactionTimeline({
  transactions,
  stockUnit,
  onVoidAndReplace,
}: SupplyTransactionTimelineProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const { data: locations = [] } = useSupplyLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const [voidingTransaction, setVoidingTransaction] = useState<SupplyTransaction | null>(null);

  if (transactions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic text-center py-3">
        No transactions recorded
      </p>
    );
  }

  return (
    <>
      <div className="space-y-1">
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

  const config = TYPE_CONFIG[transaction.type] ?? TYPE_CONFIG['received'];
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
    transaction.cost ||
    transaction.notes ||
    transaction.voidReason
  );
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  return (
    <div
      className={`border border-border rounded-md overflow-hidden ${isVoided ? 'opacity-60' : ''}`}
    >
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-accent/30 transition-colors cursor-pointer"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        onKeyDown={e => {
          if (e.key === 'Enter' && hasDetails) setIsExpanded(!isExpanded);
        }}
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
      >
        {hasDetails && (
          <ChevronRight
            size={12}
            className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
        {!hasDetails && <div className="w-3 flex-shrink-0" />}

        <Icon size={14} className={`flex-shrink-0 ${config.color}`} />

        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatDateForDisplay(transaction.createdAt)}
        </span>

        {isVoided && (
          <Chip color="danger" size="xs">
            Voided
          </Chip>
        )}

        <span className="text-card-foreground/30 flex-shrink-0">·</span>

        <span
          className={`text-xs font-semibold flex-shrink-0 ${config.color} ${isVoided ? 'line-through' : ''}`}
        >
          {quantityDisplay} {unit}
        </span>

        <span className="text-card-foreground/30 flex-shrink-0">·</span>

        <span className="text-xs text-muted-foreground truncate flex-1">{locationName}</span>

        {canVoid && (
          <Tooltip content="Void transaction" side="bottom">
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              onClick={e => {
                e.stopPropagation();
                onVoid(transaction);
              }}
            >
              <Ban className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
      </div>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-2 pt-1 border-t border-border/50">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {transaction.lotNumber && (
              <InfoField label="Lot #" value={transaction.lotNumber} inline={false} />
            )}
            {transaction.poNumber && (
              <InfoField label="PO #" value={transaction.poNumber} inline={false} />
            )}
            {transaction.cost !== undefined && (
              <InfoField label="Cost" value={formatCurrency(transaction.cost)} inline={false} />
            )}
            {transaction.expirationDate && (
              <InfoField
                label="Expires"
                value={formatDateForDisplay(transaction.expirationDate)}
                inline={false}
              />
            )}
          </div>
          {transaction.voidReason && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <InfoField label="Void Reason" value={transaction.voidReason} inline={false} />
            </div>
          )}
          {transaction.notes && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {transaction.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
