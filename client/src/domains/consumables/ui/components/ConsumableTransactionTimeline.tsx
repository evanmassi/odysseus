/**
 * Consumable Transaction Timeline
 *
 * Chronological list of stock transactions with collapsible details
 * and type-specific color coding.
 */

import { useState, useMemo } from 'react';

import {
  ChevronRight,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  Trash2,
} from 'lucide-react';

import { useConsumableLocationsQuery } from '@domains/consumables/hooks';
import { InfoField } from '@shared/ui';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';

import type { ConsumableTransaction } from '@odysseus/shared-schemas';

const TYPE_CONFIG: Record<string, { icon: typeof PackagePlus; color: string }> = {
  received: { icon: PackagePlus, color: 'text-success-text' },
  consumed: { icon: PackageMinus, color: 'text-warning-text' },
  count_adjustment: { icon: ClipboardCheck, color: 'text-primary' },
  disposed: { icon: Trash2, color: 'text-danger-text' },
};

interface ConsumableTransactionTimelineProps {
  transactions: ConsumableTransaction[];
  stockUnit?: string;
}

export function ConsumableTransactionTimeline({
  transactions,
  stockUnit,
}: ConsumableTransactionTimelineProps) {
  const { data: locations = [] } = useConsumableLocationsQuery();
  const locationNameMap = useMemo(
    () => new Map(locations.map(l => [l.id, l.name])),
    [locations]
  );

  if (transactions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic text-center py-3">
        No transactions recorded
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map(txn => (
        <TransactionEntry
          key={txn.id}
          transaction={txn}
          locationName={locationNameMap.get(txn.locationId) ?? txn.locationId}
          stockUnit={stockUnit}
        />
      ))}
    </div>
  );
}

function TransactionEntry({
  transaction,
  locationName,
  stockUnit,
}: {
  transaction: ConsumableTransaction;
  locationName: string;
  stockUnit?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = TYPE_CONFIG[transaction.type] ?? TYPE_CONFIG['received'];
  const Icon = config.icon;
  const unit = stockUnit ?? 'units';
  const quantityDisplay = transaction.quantityChange >= 0
    ? `+${transaction.quantityChange}`
    : String(transaction.quantityChange);

  /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean truthiness check */
  const hasDetails = !!(transaction.lotNumber || transaction.poNumber || transaction.cost || transaction.notes);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-accent/30 transition-colors cursor-pointer"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        onKeyDown={e => { if (e.key === 'Enter' && hasDetails) setIsExpanded(!isExpanded); }}
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

        <span className="text-card-foreground/30 flex-shrink-0">·</span>

        <span className={`text-xs font-semibold flex-shrink-0 ${config.color}`}>
          {quantityDisplay} {unit}
        </span>

        <span className="text-card-foreground/30 flex-shrink-0">·</span>

        <span className="text-xs text-muted-foreground truncate">
          {locationName}
        </span>
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
              <InfoField label="Expires" value={formatDateForDisplay(transaction.expirationDate)} inline={false} />
            )}
          </div>
          {transaction.notes && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{transaction.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
