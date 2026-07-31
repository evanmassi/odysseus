/**
 * Barcode Type Labels
 *
 * Display names for the shared barcode type vocabulary, used by the add form's picker and
 * by the list row when a barcode carries no label of its own.
 */

import { type BarcodeType } from '@odysseus/shared-schemas';

export const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
  internal: 'Internal',
  manufacturer_sku: 'Manufacturer SKU',
  upc: 'UPC',
};
