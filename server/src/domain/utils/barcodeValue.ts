/**
 * Internal Barcode Values
 *
 * The lab's own label on a physical thing, as opposed to a manufacturer's. The prefix names
 * what was labelled, so a scanned value is recognisable before it is looked up.
 */

import { nanoid } from 'nanoid';

const INTERNAL_BARCODE_PREFIXES = { supplyItem: 'SITM', reagentItem: 'RITM', reagentLot: 'RLOT' };

export function generateInternalBarcodeValue(
  labelled: keyof typeof INTERNAL_BARCODE_PREFIXES
): string {
  return `${INTERNAL_BARCODE_PREFIXES[labelled]}-${nanoid(8)}`;
}
