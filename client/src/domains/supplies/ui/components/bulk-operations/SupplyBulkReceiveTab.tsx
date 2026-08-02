/**
 * Supply Bulk Receive Tab
 *
 * Binds the shared movement form to the supply receive endpoint, adding the fields a receipt
 * records beyond quantity and location.
 */

import { useMemo } from 'react';

import { useLabLocationsQuery } from '@domains/lab-management';
import { useSupplyBulkReceiveMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { buildHierarchyOptions, Input, withPlaceholder } from '@shared/ui';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { BulkStockMovementTab, toItemAutocompleteOptions } from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { useSupplyBarcodeLinker, useSupplyItemPackaging } from './supplyBulkBindings';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface ReceiveExtra {
  lotNumber: string;
  poNumber: string;
  cost: string;
}

const INITIAL: ReceiveExtra = { lotNumber: '', poNumber: '', cost: '' };

interface BulkReceiveTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

export function SupplyBulkReceiveTab({ items, onComplete }: BulkReceiveTabProps) {
  const { data: locations = [] } = useLabLocationsQuery();
  const bulkReceiveMutation = useSupplyBulkReceiveMutation();
  const linker = useSupplyBarcodeLinker();

  const locationOptions = useMemo(
    () => withPlaceholder('Select...', buildHierarchyOptions(locations)),
    [locations]
  );
  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkStockMovementTab<SupplyItemWithStock, ReceiveExtra>
      items={items}
      itemOptions={itemOptions}
      locationOptions={locationOptions}
      labels={{
        emptyBody: 'Search for items above to add them to this receive order.',
        countNoun: 'item',
        actionVerb: 'receive',
        submitLabel: 'Receive All',
        loadingText: 'Receiving...',
      }}
      isPending={bulkReceiveMutation.isPending}
      onComplete={onComplete}
      useItemPackaging={useSupplyItemPackaging}
      renderScanInput={onItemFound => (
        <BarcodeScanInput
          catalog="supply"
          items={items}
          onItemFound={onItemFound}
          onLink={linker.link}
          isLinking={linker.isLinking}
        />
      )}
      extraFields={{
        initial: INITIAL,
        render: (extra, update) => (
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
              poNumber: row.extra.poNumber || undefined,
              cost: row.extra.cost ? parseFloat(row.extra.cost) : undefined,
            })),
          },
          {
            onSuccess: result => {
              notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Received' });
              onComplete();
            },
          }
        )
      }
    />
  );
}
