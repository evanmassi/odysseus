/**
 * Barcode Type Vocabulary
 *
 * Shared classification for catalog barcodes, applied across supply and reagent
 * barcodes so the two stay in sync.
 */

import { z } from 'zod';

const barcodeTypeValues = ['internal', 'manufacturer_sku', 'upc'] as const;
export const barcodeTypeSchema = z.enum(barcodeTypeValues);
export type BarcodeType = z.infer<typeof barcodeTypeSchema>;
