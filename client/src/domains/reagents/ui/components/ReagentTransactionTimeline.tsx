// PITFALL: a FEFO issue writes one ledger row per lot with a shared timestamp, so rows are grouped to read and void as one movement.
import { useMemo, useState } from 'react';

import { formatQuantity, isAdminRole } from '@odysseus/shared-schemas';
import { Ban, ChevronRight } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useLabLocationsQuery } from '@domains/lab-management';
import { groupTransactions } from '@domains/reagents/utils/reagentTransactionGroups';
import { useDemoItemLock } from '@shared/hooks/useDemoItemLock';
import { Button, Tooltip } from '@shared/ui';
import { transactionTypeDisplay } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';

import { ReagentVoidTransactionModal } from './ReagentVoidTransactionModal';

import type { TransactionMode, TransactionPrefill } from './ReagentTransactionForm';
import type { TransactionGroup } from '@domains/reagents/utils/reagentTransactionGroups';
import type { ReagentLot, ReagentTransaction } from '@odysseus/shared-schemas';

interface ReagentTransactionTimelineProps {
  transactions: ReagentTransaction[];
  lots: ReagentLot[];
  stockUnit?: string;
  onVoidAndReplace?: (
    itemId: string,
    initialTab: TransactionMode,
    prefill: TransactionPrefill
  ) => void;
}

export function ReagentTransactionTimeline({
  transactions,
  lots,
  stockUnit,
  onVoidAndReplace,
}: ReagentTransactionTimelineProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const isDemoLockedTransaction = useDemoItemLock();
  const { data: locations = [] } = useLabLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const lotMap = useMemo(() => new Map(lots.map(lot => [lot.id, lot])), [lots]);
  const [voidingGroup, setVoidingGroup] = useState<TransactionGroup | undefined>();

  const groups = useMemo(() => groupTransactions(transactions), [transactions]);

  if (groups.length === 0) {
    return <p className="text-body-sm italic text-card-foreground/30">No transactions recorded</p>;
  }

  return (
    <>
      <div className="space-y-0.5">
        {groups.map(group => (
          <TransactionEntry
            key={group.id}
            group={group}
            locationName={locationNameMap.get(group.locationId) ?? group.locationId}
            lotMap={lotMap}
            stockUnit={stockUnit}
            isAdmin={isAdmin}
            isVoidLocked={group.transactions.some(isDemoLockedTransaction)}
            onVoid={setVoidingGroup}
          />
        ))}
      </div>

      {voidingGroup && (
        <ReagentVoidTransactionModal
          group={voidingGroup}
          lotMap={lotMap}
          stockUnit={stockUnit}
          locationName={locationNameMap.get(voidingGroup.locationId) ?? voidingGroup.locationId}
          onClose={() => setVoidingGroup(undefined)}
          onVoidAndReplace={onVoidAndReplace}
        />
      )}
    </>
  );
}

function TransactionEntry({
  group,
  locationName,
  lotMap,
  stockUnit,
  isAdmin,
  isVoidLocked,
  onVoid,
}: {
  group: TransactionGroup;
  locationName: string;
  lotMap: Map<string, ReagentLot>;
  stockUnit?: string;
  isAdmin: boolean;
  isVoidLocked: boolean;
  onVoid: (group: TransactionGroup) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isFullyVoided = group.voidedCount === group.transactions.length;
  const isPartiallyVoided = group.voidedCount > 0 && !isFullyVoided;
  const isReversal = group.type === 'void_reversal';
  const canVoid = isAdmin && !isFullyVoided && !isReversal && !isVoidLocked;

  const config = transactionTypeDisplay(group.type);
  const Icon = config.icon;
  const amount = stockUnit
    ? formatQuantity(Math.abs(group.quantityChange), stockUnit)
    : String(Math.abs(group.quantityChange));
  const quantityDisplay = `${group.quantityChange >= 0 ? '+' : '−'}${amount}`;

  const first = group.transactions[0];
  const hasEntryDetails =
    !!first.poNumber || first.cost !== undefined || !!first.notes || !!first.voidReason;
  const hasDetails = group.transactions.length > 1 || hasEntryDetails || !!first.lotId;

  const toggle = () => hasDetails && setIsExpanded(!isExpanded);

  return (
    <div className={isFullyVoided ? 'opacity-60' : ''}>
      <div
        className="group flex cursor-pointer items-center gap-2 py-1 text-body-sm"
        onClick={toggle}
        onKeyDown={e => {
          if (e.key === 'Enter') toggle();
        }}
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
      >
        <ChevronRight
          size={12}
          className={`flex-shrink-0 text-card-foreground/40 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasDetails ? 'invisible' : ''}`}
        />
        <Icon size={14} aria-label={config.label} className={`flex-shrink-0 ${config.color}`} />
        <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-foreground">
          {formatDateForDisplay(group.createdAt)}
        </span>
        {isFullyVoided && (
          <Chip color="danger" size="xs">
            Voided
          </Chip>
        )}
        {isPartiallyVoided && (
          <Chip color="warning" size="xs">
            {group.voidedCount} of {group.transactions.length} voided
          </Chip>
        )}
        <span aria-hidden className="text-foreground/30">
          ·
        </span>
        <span
          className={`whitespace-nowrap text-body-sm font-semibold ${config.color} ${isFullyVoided ? 'line-through' : ''}`}
        >
          {quantityDisplay}
        </span>
        {group.transactions.length > 1 && (
          <span className="whitespace-nowrap text-caption text-muted-foreground">
            across {group.transactions.length} lots
          </span>
        )}
        <span aria-hidden className="text-foreground/30">
          ·
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
              <Button variant="ghost-danger" size="xs" iconOnly onClick={() => onVoid(group)}>
                <Ban className="h-3 w-3" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {isExpanded && hasDetails && (
        <div className="mb-1.5 ml-[18px] space-y-1 border-l border-line-soft pl-3">
          {group.transactions.map(txn => {
            const lot = txn.lotId ? lotMap.get(txn.lotId) : undefined;
            const lotAmount = stockUnit
              ? formatQuantity(Math.abs(txn.quantityChange), stockUnit)
              : String(Math.abs(txn.quantityChange));
            return (
              <div key={txn.id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-data-sm text-muted-foreground">
                  {lot?.lotNumber ?? (txn.lotId ? 'No lot #' : '—')}
                  {lot?.expirationDate && (
                    <span className="ml-1.5 text-foreground/40">
                      exp {formatDateForDisplay(lot.expirationDate)}
                    </span>
                  )}
                </span>
                <span
                  className={`whitespace-nowrap text-body-sm ${txn.voidedAt ? 'text-muted-foreground line-through' : 'text-card-foreground/85'}`}
                >
                  {txn.quantityChange >= 0 ? '+' : '−'}
                  {lotAmount}
                </span>
              </div>
            );
          })}

          {hasEntryDetails && (
            <div className="space-y-1 border-t border-line-faint pt-1">
              {first.poNumber && <TxnDetail label="PO #" value={first.poNumber} />}
              {first.cost !== undefined && (
                <TxnDetail label="Cost" value={formatCurrency(first.cost) ?? '—'} />
              )}
              {first.voidReason && <TxnDetail label="Void Reason" value={first.voidReason} />}
              {first.notes && <TxnDetail label="Notes" value={first.notes} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
