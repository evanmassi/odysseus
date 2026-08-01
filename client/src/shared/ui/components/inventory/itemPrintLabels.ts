/**
 * Item Print Labels
 *
 * Pairs a catalog's items with the barcodes fetched for them, producing one label per item that
 * has a primary barcode.
 */

import type { PrintableLabel } from '@shared/ui/components/barcodes';

interface LabelledItem {
  id: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
}

export function toItemPrintableLabels(
  items: LabelledItem[],
  barcodes: { itemId: string; barcodeValue: string | null }[]
): PrintableLabel[] {
  const itemMap = new Map(items.map(item => [item.id, item]));

  return barcodes.flatMap(barcode => {
    // Skip items without a primary barcode, and orphans — an item can be deleted between
    // selection and print click.
    const item = barcode.barcodeValue === null ? undefined : itemMap.get(barcode.itemId);
    if (!item || barcode.barcodeValue === null) return [];
    return [
      {
        itemId: barcode.itemId,
        itemName: item.name,
        manufacturer: item.manufacturer,
        catalogNumber: item.catalogNumber,
        barcodeValue: barcode.barcodeValue,
      },
    ];
  });
}
