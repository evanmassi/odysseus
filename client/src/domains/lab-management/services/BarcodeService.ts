/**
 * Barcode Service
 *
 * HTTP client for lab-wide barcode resolution.
 */

import { barcodeResolveResponseSchema, type BarcodeMatch } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class BarcodeService {
  private static readonly BASE_PATH = '/barcodes';

  static async resolve(value: string): Promise<BarcodeMatch | null> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/resolve?value=${encodeURIComponent(value)}`,
      barcodeResolveResponseSchema,
      { 'Cache-Control': 'no-cache' }
    );
    return response.match;
  }
}
