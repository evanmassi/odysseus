import { useCallback } from 'react';

import { normalizePlateMap, type PlateMap, type Protocol } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';

export function useUpdatePlateMap(plateMapId: string) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  return useCallback(
    (recipe: (draft: PlateMap, protocol: Protocol) => void) =>
      updateProtocol(draft => {
        const plateMap = draft.plateMaps.find(candidate => candidate.id === plateMapId);
        if (!plateMap) return;
        recipe(plateMap, draft);
        normalizePlateMap(plateMap);
      }),
    [plateMapId, updateProtocol]
  );
}
