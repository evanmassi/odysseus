/**
 * Supply Bulk Bindings
 *
 * Adapters the shared bulk components take as props: where a supply's packaging chain comes from,
 * and how an unrecognised barcode gets linked to one.
 */

import { useCallback } from 'react';

import { useSupplyItemDetailQuery } from '@domains/supplies/hooks';
import { useAddSupplyBarcodeMutation } from '@domains/supplies/hooks/useSupplyMutations';

import type { BarcodeType } from '@odysseus/shared-schemas';
import type { ItemPackaging } from '@shared/ui/components/inventory';

export function useSupplyItemPackaging(itemId: string): ItemPackaging {
  const { data: detail } = useSupplyItemDetailQuery(itemId);
  return {
    packagingLevels: detail?.packagingLevels ?? [],
    stockUnit: detail?.item.stockUnit ?? '',
  };
}

export function useSupplyBarcodeLinker() {
  const addBarcodeMutation = useAddSupplyBarcodeMutation();

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
