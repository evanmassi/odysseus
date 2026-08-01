/**
 * Reagent Print Labels
 *
 * Resolves selected reagents to printable labels, at either level: the product's identity, or
 * one bottle's lot.
 */

import { ReagentService } from '@domains/reagents/services/ReagentService';
import { toItemPrintableLabels } from '@shared/ui/components/inventory';

import type { ReagentBulkLotLabelsResponse, ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

export type ReagentLotLabel = ReagentBulkLotLabelsResponse['lotLabels'][number];

export async function fetchReagentItemPrintLabels(
  items: ReagentItemWithStock[],
  itemIds: string[]
): Promise<PrintableLabel[]> {
  const barcodes = await ReagentService.bulkGetBarcodes(itemIds);
  return toItemPrintableLabels(items, barcodes);
}

export function toLotPrintableLabels(
  items: ReagentItemWithStock[],
  lotLabels: ReagentLotLabel[]
): PrintableLabel[] {
  const itemMap = new Map(items.map(item => [item.id, item]));

  return lotLabels.flatMap(lotLabel => {
    const item = itemMap.get(lotLabel.itemId);
    if (!item) return [];
    return [
      {
        itemId: lotLabel.itemId,
        itemName: item.name,
        manufacturer: item.manufacturer,
        catalogNumber: item.catalogNumber,
        lotNumber: lotLabel.lotNumber,
        expirationDate: lotLabel.expirationDate,
        barcodeValue: lotLabel.barcodeValue,
      },
    ];
  });
}
