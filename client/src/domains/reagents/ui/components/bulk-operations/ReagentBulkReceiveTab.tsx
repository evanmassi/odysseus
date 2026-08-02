/**
 * Reagent Bulk Receive Tab
 *
 * Binds the shared movement form to the reagent receive endpoint. Every field beyond quantity and
 * location is optional, so this doubles as the way a lab enters stock it already owns: give each
 * row its lot, expiry and the date it actually arrived.
 */

import { useMemo } from 'react';

import { useLabLocationsQuery } from '@domains/lab-management';
import { useReagentBulkReceiveMutation } from '@domains/reagents/hooks';
import { buildHierarchyOptions, DatePicker, Input, withPlaceholder } from '@shared/ui';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { BulkStockMovementTab, toItemAutocompleteOptions } from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { normalizeDateString } from '@shared/utils/dateFormatters';

import { useReagentBarcodeLinker, useReagentItemPackaging } from './reagentBulkBindings';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReceiveExtra {
  lotNumber: string;
  expirationDate: string;
  receivedDate: string;
  poNumber: string;
  cost: string;
}

const INITIAL: ReceiveExtra = {
  lotNumber: '',
  expirationDate: '',
  receivedDate: '',
  poNumber: '',
  cost: '',
};

interface BulkReagentReceiveTabProps {
  items: ReagentItemWithStock[];
  onComplete: () => void;
}

export function ReagentBulkReceiveTab({ items, onComplete }: BulkReagentReceiveTabProps) {
  const { data: locations = [] } = useLabLocationsQuery();
  const bulkReceiveMutation = useReagentBulkReceiveMutation();
  const linker = useReagentBarcodeLinker();

  const locationOptions = useMemo(
    () => withPlaceholder('Select...', buildHierarchyOptions(locations)),
    [locations]
  );
  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkStockMovementTab<ReagentItemWithStock, ReceiveExtra>
      items={items}
      itemOptions={itemOptions}
      locationOptions={locationOptions}
      labels={{
        emptyBody: 'Search for reagents above to add them to this receive order.',
        countNoun: 'reagent',
        actionVerb: 'receive',
        submitLabel: 'Receive All',
        loadingText: 'Receiving...',
      }}
      isPending={bulkReceiveMutation.isPending}
      onComplete={onComplete}
      useItemPackaging={useReagentItemPackaging}
      renderScanInput={onItemFound => (
        <BarcodeScanInput
          catalog="reagent"
          items={items}
          onItemFound={onItemFound}
          onLink={linker.link}
          isLinking={linker.isLinking}
        />
      )}
      extraFields={{
        initial: INITIAL,
        render: (extra, update) => (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className={FIELD_LABEL_COMPACT}>Lot #</span>
                <Input
                  type="text"
                  value={extra.lotNumber}
                  onValueChange={v => update({ lotNumber: v })}
                  size="sm"
                  fullWidth
                />
              </div>
              <div>
                <span className={FIELD_LABEL_COMPACT}>Expiration</span>
                <DatePicker
                  value={normalizeDateString(extra.expirationDate)}
                  onChange={v => update({ expirationDate: v ?? '' })}
                  clearable
                  fullWidth
                />
              </div>
              <div>
                <span className={FIELD_LABEL_COMPACT}>Received</span>
                <DatePicker
                  value={normalizeDateString(extra.receivedDate)}
                  onChange={v => update({ receivedDate: v ?? '' })}
                  clearable
                  fullWidth
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className={FIELD_LABEL_COMPACT}>PO #</span>
                <Input
                  type="text"
                  value={extra.poNumber}
                  onValueChange={v => update({ poNumber: v })}
                  size="sm"
                  fullWidth
                />
              </div>
              <div>
                <span className={FIELD_LABEL_COMPACT}>Cost ($)</span>
                <Input
                  type="number"
                  value={extra.cost}
                  onValueChange={v => update({ cost: v })}
                  size="sm"
                  fullWidth
                />
              </div>
            </div>
          </div>
        ),
      }}
      onSubmit={rows =>
        bulkReceiveMutation.mutate(
          {
            items: rows.map(row => ({
              itemId: row.itemId,
              locationId: row.locationId,
              quantity: row.quantity,
              lotNumber: row.extra.lotNumber || undefined,
              expirationDate: row.extra.expirationDate || undefined,
              receivedDate: row.extra.receivedDate || undefined,
              poNumber: row.extra.poNumber || undefined,
              cost: row.extra.cost ? parseFloat(row.extra.cost) : undefined,
            })),
          },
          {
            onSuccess: result => {
              notifyBulkResult(result, { entityLabel: 'reagents', actionVerb: 'Received' });
              onComplete();
            },
          }
        )
      }
    />
  );
}
