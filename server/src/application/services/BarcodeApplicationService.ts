/**
 * Barcode Resolution
 *
 * Resolves a scanned value across every catalog that holds barcodes, so a scan says what a
 * thing is rather than requiring you to already know. Barcode tables stay per-catalog.
 */

import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';

import type { BarcodeMatch } from '@odysseus/shared-schemas';

export class BarcodeApplicationService {
  constructor(
    private supplyItemRepository: SupplyItemRepository,
    private reagentItemRepository: ReagentItemRepository
  ) {}

  /** Null when no catalog holds the value, or when the item it names belongs to another lab. */
  async resolve(labId: string, barcodeValue: string): Promise<BarcodeMatch | null> {
    const supplyBarcode = await this.supplyItemRepository.findByBarcodeValue(barcodeValue);
    if (supplyBarcode) {
      const item = await this.supplyItemRepository.findById(supplyBarcode.itemId, labId);
      if (item) return { catalog: 'supply', itemId: item.id, itemName: item.name };
    }

    const reagentBarcode = await this.reagentItemRepository.findByBarcodeValue(barcodeValue);
    if (reagentBarcode) {
      const item = await this.reagentItemRepository.findById(reagentBarcode.itemId, labId);
      if (item) return { catalog: 'reagent', itemId: item.id, itemName: item.name };
    }

    return null;
  }
}
