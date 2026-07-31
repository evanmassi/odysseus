/**
 * Barcode Vocabulary and Resolution
 *
 * The barcode type shared by supply and reagent barcodes, plus the lab-wide resolve
 * result — which names the catalog a scanned value belongs to, so a scan identifies
 * a thing without the scanner knowing what it is first.
 */

import { z } from 'zod';

export const BARCODE_TYPE_VALUES = ['internal', 'manufacturer_sku', 'upc'] as const;
export const barcodeTypeSchema = z.enum(BARCODE_TYPE_VALUES);
export type BarcodeType = z.infer<typeof barcodeTypeSchema>;

// Equipment carries no barcodes, so a scan can only ever land in these two catalogs.
const barcodeCatalogValues = ['supply', 'reagent'] as const;

const barcodeMatchSchema = z.object({
  catalog: z.enum(barcodeCatalogValues),
  itemId: z.string(),
  itemName: z.string(),
});

export const barcodeResolveResponseSchema = z.object({
  match: barcodeMatchSchema.nullable(),
});

export type BarcodeMatch = z.infer<typeof barcodeMatchSchema>;
