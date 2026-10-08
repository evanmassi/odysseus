import { useMemo, useState } from 'react';

import { formatQuantity, isAdminRole, pluralizeUnit } from '@odysseus/shared-schemas';
import { Eye, EyeOff, MapPin, Printer, SquarePen } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { buildLocationPathMap, useLabLocationsQuery } from '@domains/lab-management';
import { resolveLotExpiry } from '@domains/reagents/utils/reagentExpiry';
import { isLotDrawable } from '@domains/reagents/utils/reagentLots';
import { Button, Tooltip } from '@shared/ui';
import { BarcodePrint } from '@shared/ui/components/barcodes';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { ReagentLotModal } from './ReagentLotModal';

import type { ReagentBarcode, ReagentLot } from '@odysseus/shared-schemas';

interface ReagentLotPanelProps {
  itemId: string;
  itemName: string;
  lots: ReagentLot[];
  lotBarcodes: ReagentBarcode[];
  stockUnit?: string;
  expiryWarningDays?: number;
}

function compareForDisplay(a: ReagentLot, b: ReagentLot): number {
  const rank = (lot: ReagentLot) => (isLotDrawable(lot) ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);

  // PITFALL: undated lots sort last to match the server's draw order.
  if (a.expirationDate === b.expirationDate) return 0;
  if (!a.expirationDate) return 1;
  if (!b.expirationDate) return -1;
  return a.expirationDate < b.expirationDate ? -1 : 1;
}

export function ReagentLotPanel({
  itemId,
  itemName,
  lots,
  lotBarcodes,
  stockUnit,
  expiryWarningDays,
}: ReagentLotPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const { data: locations = [] } = useLabLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

  // PITFALL: the chip names the container you reach for; the rooms above it ride in the tooltip so rows stay narrow.
  const locationPathMap = useMemo(() => buildLocationPathMap(locations), [locations]);
  const barcodeByLotId = useMemo(
    () => new Map(lotBarcodes.map(bc => [bc.lotId, bc.barcodeValue])),
    [lotBarcodes]
  );
  const [editingLot, setEditingLot] = useState<ReagentLot | undefined>();
  const [printingLot, setPrintingLot] = useState<ReagentLot | undefined>();
  const [showInactive, setShowInactive] = useState(false);

  const ordered = useMemo(() => [...lots].sort(compareForDisplay), [lots]);
  const printingBarcodeValue = printingLot ? barcodeByLotId.get(printingLot.id) : undefined;

  if (ordered.length === 0) {
    return <p className="text-caption italic text-muted-foreground">No lots recorded</p>;
  }

  const onHand = ordered.filter(isLotDrawable);
  const inactiveCount = ordered.length - onHand.length;
  const visible = showInactive ? ordered : onHand;
  const total = onHand.reduce((sum, lot) => sum + lot.quantity, 0);
  const amount = (value: number) => (stockUnit ? formatQuantity(value, stockUnit) : String(value));

  return (
    <div className="border border-line-soft">
      {visible.length === 0 && (
        <p className="px-3 py-2 text-caption italic text-muted-foreground">No lots in stock</p>
      )}

      {visible.map((lot, index) => {
        const expiry = resolveLotExpiry(lot.expirationDate, expiryWarningDays);
        const locationName = locationNameMap.get(lot.locationId);
        const dates = [
          lot.receivedDate && `Rec ${formatDateForDisplay(lot.receivedDate)}`,
          lot.openedDate && `Opened ${formatDateForDisplay(lot.openedDate)}`,
          lot.expirationDate && `Exp ${formatDateForDisplay(lot.expirationDate)}`,
        ].filter(Boolean);

        return (
          <div
            key={lot.id}
            className={`px-3 py-2 ${
              index < visible.length - 1 ? 'border-b border-line-faint' : ''
            } ${isLotDrawable(lot) ? '' : 'opacity-50'}`}
          >
            <div className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate font-mono text-data-sm text-card-foreground">
                {lot.lotNumber ?? 'No lot #'}
              </span>
              {locationName && (
                <Tooltip content={locationPathMap.get(lot.locationId) ?? locationName} side="top">
                  <Chip color="info" size="xs" lead={<MapPin />}>
                    {locationName}
                  </Chip>
                </Tooltip>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-caption text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-mono text-data-sm text-card-foreground">
                  {amount(lot.quantity)}
                </span>
                {dates.length > 0 && <span className="ml-1.5">· {dates.join(' · ')}</span>}
              </span>
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
              {barcodeByLotId.has(lot.id) && (
                <Tooltip content="Print lot label" side="bottom">
                  <Button variant="ghost" size="xs" iconOnly onClick={() => setPrintingLot(lot)}>
                    <Printer className="h-3 w-3" />
                  </Button>
                </Tooltip>
              )}
              {isAdmin && (
                <Tooltip content="Edit dates" side="bottom">
                  <Button variant="ghost" size="xs" iconOnly onClick={() => setEditingLot(lot)}>
                    <SquarePen className="h-3 w-3" />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t border-line-soft bg-primary/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            On hand
          </span>
          {inactiveCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowInactive(!showInactive)}
              leftIcon={showInactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            >
              {showInactive ? 'Hide' : 'Show'} {inactiveCount} inactive
            </Button>
          )}
        </div>
        <span className="font-mono text-data-sm text-card-foreground">
          {amount(total)}
          <span className="ml-1.5 text-foreground/40">
            over {onHand.length} {pluralizeUnit('lot', onHand.length)}
          </span>
        </span>
      </div>

      {editingLot && (
        <ReagentLotModal
          itemId={itemId}
          lot={editingLot}
          stockUnit={stockUnit}
          onClose={() => setEditingLot(undefined)}
        />
      )}

      {printingLot && printingBarcodeValue && (
        <BarcodePrint
          isOpen={true}
          onClose={() => setPrintingLot(undefined)}
          barcodeValue={printingBarcodeValue}
          itemName={itemName}
          lotNumber={printingLot.lotNumber}
          expirationDate={printingLot.expirationDate}
        />
      )}
    </div>
  );
}
