/**
 * Reagent Bulk Issue Tab
 *
 * Binds the shared movement form to the reagent issue endpoint. The server draws FEFO per item
 * and skips expired stock entirely — a bulk run cannot stop to ask — so a row names no lot.
 */

import { useMemo } from 'react';

import { useLabLocationsQuery } from '@domains/lab-management';
import { useReagentBulkIssueMutation } from '@domains/reagents/hooks';
import { buildHierarchyOptions, withPlaceholder } from '@shared/ui';
import { BarcodeScanInput } from '@shared/ui/components/barcodes';
import { BulkStockMovementTab, toItemAutocompleteOptions } from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { useReagentBarcodeLinker, useReagentItemPackaging } from './reagentBulkBindings';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

interface BulkReagentIssueTabProps {
  items: ReagentItemWithStock[];
  onComplete: () => void;
}

export function ReagentBulkIssueTab({ items, onComplete }: BulkReagentIssueTabProps) {
  const { data: locations = [] } = useLabLocationsQuery();
  const bulkIssueMutation = useReagentBulkIssueMutation();
  const linker = useReagentBarcodeLinker();

  const locationOptions = useMemo(
    () => withPlaceholder('Select...', buildHierarchyOptions(locations)),
    [locations]
  );
  const itemOptions = useMemo(() => toItemAutocompleteOptions(items), [items]);

  return (
    <BulkStockMovementTab<ReagentItemWithStock, undefined>
      items={items}
      itemOptions={itemOptions}
      locationOptions={locationOptions}
      labels={{
        emptyBody: 'Search for reagents above to add them.',
        countNoun: 'reagent',
        actionVerb: 'issue',
        submitLabel: 'Issue All',
        loadingText: 'Recording...',
      }}
      isPending={bulkIssueMutation.isPending}
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
              notifyBulkResult(result, { entityLabel: 'reagents', actionVerb: 'Issued' });
              onComplete();
            },
          }
        )
      }
    />
  );
}
