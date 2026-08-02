/**
 * Reagent Bulk Bindings
 *
 * Adapters the shared bulk components take as props: where a reagent's packaging chain comes
 * from, and how an unrecognised barcode gets linked to one.
 */

import { useCallback } from 'react';

import { useAddReagentBarcodeMutation, useReagentItemDetailQuery } from '@domains/reagents/hooks';

import type { BarcodeType } from '@odysseus/shared-schemas';
import type { ItemPackaging } from '@shared/ui/components/inventory';

export function useReagentItemPackaging(itemId: string): ItemPackaging {
  const { data: detail } = useReagentItemDetailQuery(itemId);
  return {
    packagingLevels: detail?.packagingLevels ?? [],
    stockUnit: detail?.item.stockUnit ?? '',
  };
}

export function useReagentBarcodeLinker() {
  const addBarcodeMutation = useAddReagentBarcodeMutation();

  const link = useCallback(
    (
      itemId: string,
      data: { barcodeValue: string; barcodeType: BarcodeType },
      onSuccess: () => void
    ) => addBarcodeMutation.mutate({ itemId, data }, { onSuccess }),
    [addBarcodeMutation]
  );

  return { link, isLinking: addBarcodeMutation.isPending };
}
