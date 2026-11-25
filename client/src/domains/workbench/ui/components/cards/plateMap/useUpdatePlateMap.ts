import { useCallback } from 'react';

import { normalizePlateMap, type PlateMap } from '@odysseus/shared-schemas';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';

export function useUpdatePlateMap(plateMapId: string) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  return useCallback(
    (recipe: (draft: PlateMap) => void) =>
      updateProtocol(draft => {
        const plateMap = draft.plateMaps.find(candidate => candidate.id === plateMapId);
        if (!plateMap) return;
        recipe(plateMap);
        normalizePlateMap(plateMap);
      }),
    [plateMapId, updateProtocol]
  );
}
