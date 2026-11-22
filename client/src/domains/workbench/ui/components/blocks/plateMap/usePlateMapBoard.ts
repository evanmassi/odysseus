import { useCallback } from 'react';

import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { readsSeriesAlike } from '../../../../utils/plateMap/plateSeries';

import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { PlateMapBlock } from '@odysseus/shared-schemas';

// PITFALL: the map keeps an older solved board unless its series read differently, so map code reading any other board number will not refresh.
export function usePlateMapBoard(block: PlateMapBlock): SolvedBoard {
  const isAlikeForMap = useCallback(
    (a: SolvedBoard, b: SolvedBoard) => readsSeriesAlike(Object.values(block.series), a, b),
    [block.series]
  );
  return useStoreWithEqualityFn(useWorkbenchStore, state => state.board, isAlikeForMap);
}
