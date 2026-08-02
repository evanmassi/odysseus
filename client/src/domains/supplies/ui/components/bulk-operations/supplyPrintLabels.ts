/**
 * Supply Print Labels
 *
 * Resolves selected supply items to their printable item labels.
 */

import { SupplyService } from '@domains/supplies/services/SupplyService';
import { toItemPrintableLabels } from '@shared/ui/components/inventory';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { PrintableLabel } from '@shared/ui/components/barcodes';

export async function fetchSupplyPrintLabels(
  items: SupplyItemWithStock[],
  itemIds: string[]
): Promise<PrintableLabel[]> {
  const response = await SupplyService.bulkGetBarcodes(itemIds);
  return toItemPrintableLabels(items, response.barcodes);
}
