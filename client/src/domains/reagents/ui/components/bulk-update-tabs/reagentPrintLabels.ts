/**
 * Reagent Print Labels
 *
 * Resolves selected reagents to their printable item labels — the product's identity, not a
 * bottle's.
 */

import { ReagentService } from '@domains/reagents/services/ReagentService';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

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
