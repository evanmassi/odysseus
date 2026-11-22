import { useCallback } from 'react';

import { normalizePlateMap, type PlateMapCard } from '@odysseus/shared-schemas';

import { useUpdateCard } from '../../../../hooks/useUpdateCard';

export function useUpdatePlateMap(card: PlateMapCard) {
  const updateCard = useUpdateCard(card);
  return useCallback(
    (recipe: (draft: PlateMapCard) => void) =>
      updateCard(draft => {
        recipe(draft);
        normalizePlateMap(draft);
      }),
    [updateCard]
  );
}
