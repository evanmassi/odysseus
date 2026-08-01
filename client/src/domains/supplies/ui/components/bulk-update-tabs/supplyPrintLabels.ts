/**
 * Supply Print Labels
 *
 * Resolves selected supply items to their printable item labels.
 */

import { SupplyService } from '@domains/supplies/services/SupplyService';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

export async function fetchSupplyPrintLabels(
  items: SupplyItemWithStock[],
  itemIds: string[]
): Promise<PrintableLabel[]> {
  const response = await SupplyService.bulkGetBarcodes(itemIds);
  const itemMap = new Map(items.map(item => [item.id, item]));
  const labels: PrintableLabel[] = [];

  for (const barcode of response.barcodes) {
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
