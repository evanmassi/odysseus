/**
 * Barcode Uniqueness Guard
 *
 * A barcode value names one physical thing in the lab, so uniqueness spans every catalog that
 * holds barcodes — each catalog's own UNIQUE constraint would still let one value sit on a
 * supply and a reagent at once, which the lab-wide resolve could not answer.
 */

import { ValidationError } from '@domain/errors/ValidationError';

interface BarcodeLookup {
  findByBarcodeValue(barcodeValue: string): Promise<{ itemId: string } | null>;
}

/** @throws ValidationError when any catalog already holds the value. */
export async function requireUnusedBarcodeValue(
  barcodeValue: string,
  lookups: BarcodeLookup[]
): Promise<void> {
  for (const lookup of lookups) {
    const existing = await lookup.findByBarcodeValue(barcodeValue);
    if (existing) {
      throw new ValidationError(`Barcode "${barcodeValue}" is already linked to another item`);
    }
  }
}
