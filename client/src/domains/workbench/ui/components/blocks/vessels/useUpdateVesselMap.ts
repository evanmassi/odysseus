import { useCallback } from 'react';

import { normalizeVesselMap, type VesselMapBlock } from '@odysseus/shared-schemas';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';

export function useUpdateVesselMap(block: VesselMapBlock) {
  const updateBlock = useUpdateBlock(block);
  return useCallback(
    (recipe: (draft: VesselMapBlock) => void) =>
      updateBlock(draft => {
        recipe(draft);
        normalizeVesselMap(draft);
      }),
    [updateBlock]
  );
}
