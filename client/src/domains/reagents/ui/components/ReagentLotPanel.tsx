/**
 * Reagent Lot Panel
 *
 * Per-lot stock for an item, listed in the order the server draws it: soonest-expiring
 * usable lot first, expired next, spent and disposed lots last.
 */

import { useMemo } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';
import { MapPin } from 'lucide-react';

import { useLocationsQuery } from '@domains/lab-management';
import { resolveLotExpiry } from '@domains/reagents/utils/reagentExpiry';
import { isLotDrawable } from '@domains/reagents/utils/reagentLots';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ReagentLot } from '@odysseus/shared-schemas';

interface ReagentLotPanelProps {
  lots: ReagentLot[];
  stockUnit?: string;
  expiryWarningDays?: number;
}

function compareForDisplay(a: ReagentLot, b: ReagentLot): number {
  const rank = (lot: ReagentLot) => (isLotDrawable(lot) ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);

  // Undated lots sort last, matching the server's draw order.
  if (a.expirationDate === b.expirationDate) return 0;
  if (!a.expirationDate) return 1;
  if (!b.expirationDate) return -1;
  return a.expirationDate < b.expirationDate ? -1 : 1;
}

export function ReagentLotPanel({ lots, stockUnit, expiryWarningDays }: ReagentLotPanelProps) {
  const { data: locations = [] } = useLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  const ordered = useMemo(() => [...lots].sort(compareForDisplay), [lots]);

  if (ordered.length === 0) {
    return <p className="text-caption italic text-muted-foreground">No lots recorded</p>;
  }

  const onHand = ordered.filter(isLotDrawable);
  const total = onHand.reduce((sum, lot) => sum + lot.quantity, 0);
  const amount = (value: number) => (stockUnit ? formatQuantity(value, stockUnit) : String(value));

  return (
    <div className="border border-line-soft">
      {ordered.map((lot, index) => {
        const expiry = resolveLotExpiry(lot.expirationDate, expiryWarningDays);
        const locationName = locationNameMap.get(lot.locationId);
        // Opened date wins when both are set — shelf life after opening is what you act on.
        const timing = lot.openedDate
          ? `opened ${formatDateForDisplay(lot.openedDate)}`
          : lot.receivedDate
            ? `received ${formatDateForDisplay(lot.receivedDate)}`
            : '';

        return (
          <div
            key={lot.id}
            className={`grid grid-cols-[1fr_auto] gap-x-4 px-3 py-2 ${
              index < ordered.length - 1 ? 'border-b border-line-faint' : ''
            } ${isLotDrawable(lot) ? '' : 'opacity-50'}`}
          >
            <span className="truncate font-mono text-data-sm text-card-foreground">
              {lot.lotNumber ?? 'No lot #'}
            </span>
            <span className="text-right font-mono text-data-sm text-card-foreground">
              {amount(lot.quantity)}
            </span>

            <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
              {locationName && (
                <Chip color="info" size="xs" lead={<MapPin />}>
                  {locationName}
                </Chip>
              )}
              <span className="truncate">{timing}</span>
            </span>

            <span className="flex items-center justify-end gap-1.5 text-caption text-muted-foreground">
              {lot.expirationDate && <span>{formatDateForDisplay(lot.expirationDate)}</span>}
              {expiry && (
                <Chip color={expiry.tone} size="xs">
                  {expiry.label}
                </Chip>
              )}
              {lot.status !== 'active' && (
                <Chip color="default" size="xs">
                  {lot.status}
                </Chip>
              )}
            </span>
          </div>
        );
      })}

      <div className="flex items-baseline justify-between border-t border-line-soft bg-primary/[0.06] px-3 py-2">
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          On hand
        </span>
        <span className="font-mono text-data-sm text-card-foreground">
          {amount(total)}
          <span className="ml-1.5 text-foreground/40">
            over {onHand.length} {pluralizeUnit('lot', onHand.length)}
          </span>
        </span>
      </div>
    </div>
  );
}
