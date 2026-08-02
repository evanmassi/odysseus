/**
 * Supply Bulk Issue Tab
 *
 * Binds the shared movement form to the supply issue endpoint. An issue records nothing beyond
 * quantity and location, so it carries no extra fields.
 */

import { useMemo } from 'react';

import { useLabLocationsQuery } from '@domains/lab-management';
import { useSupplyBulkIssueMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { buildHierarchyOptions, withPlaceholder } from '@shared/ui';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import { BulkStockMovementTab, toItemAutocompleteOptions } from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { useSupplyBarcodeLinker, useSupplyItemPackaging } from './supplyBulkBindings';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface BulkIssueTabProps {
  items: SupplyItemWithStock[];
  onComplete: () => void;
}

export function SupplyBulkIssueTab({ items, onComplete }: BulkIssueTabProps) {
  const { data: locations = [] } = useLabLocationsQuery();
  const bulkIssueMutation = useSupplyBulkIssueMutation();
  const linker = useSupplyBarcodeLinker();

  const locationOptions = useMemo(
    () => withPlaceholder('Select...', buildHierarchyOptions(locations)),
    [locations]
  );
  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkStockMovementTab<SupplyItemWithStock, undefined>
      items={items}
      itemOptions={itemOptions}
      locationOptions={locationOptions}
      labels={{
        emptyBody: 'Search for items above to add them.',
        countNoun: 'item',
        actionVerb: 'issue',
        submitLabel: 'Issue All',
        loadingText: 'Recording...',
      }}
      isPending={bulkIssueMutation.isPending}
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
      onSubmit={rows =>
        bulkIssueMutation.mutate(
          {
            items: rows.map(row => ({
              itemId: row.itemId,
              locationId: row.locationId,
              quantity: row.quantity,
            })),
          },
          {
            onSuccess: result => {
              notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Issued' });
              onComplete();
            },
          }
        )
      }
    />
  );
}
