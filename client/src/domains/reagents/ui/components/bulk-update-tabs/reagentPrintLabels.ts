/**
 * Reagent Print Labels
 *
 * Resolves selected reagents to printable labels, at either level: the product's identity, or
 * one bottle's lot.
 */

import { ReagentService } from '@domains/reagents/services/ReagentService';

import type { ReagentBulkLotLabelsResponse, ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

export type ReagentLotLabel = ReagentBulkLotLabelsResponse['lotLabels'][number];

export async function fetchReagentItemPrintLabels(
  items: ReagentItemWithStock[],
  itemIds: string[]
): Promise<PrintableLabel[]> {
  const barcodes = await ReagentService.bulkGetBarcodes(itemIds);
  const itemMap = new Map(items.map(item => [item.id, item]));
  const labels: PrintableLabel[] = [];

  for (const barcode of barcodes) {
    if (barcode.barcodeValue === null) continue;
    // Filter orphans — item could have been deleted between selection and print click.
    const item = itemMap.get(barcode.itemId);
    if (!item) continue;
    labels.push({
      itemId: barcode.itemId,
      itemName: item.name,
      manufacturer: item.manufacturer,
      catalogNumber: item.catalogNumber,
      barcodeValue: barcode.barcodeValue,
    });
  }

  return labels;
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
