import { useCallback } from 'react';

import { normalizePlateMap, type PlateMapBlock } from '@odysseus/shared-schemas';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';

export function useUpdatePlateMap(block: PlateMapBlock) {
  const updateBlock = useUpdateBlock(block);
  return useCallback(
    (recipe: (draft: PlateMapBlock) => void) =>
      updateBlock(draft => {
        recipe(draft);
        normalizePlateMap(draft);
      }),
    [updateBlock]
  );
}
