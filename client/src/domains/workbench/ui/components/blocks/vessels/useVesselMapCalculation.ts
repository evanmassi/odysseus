import { useCallback } from 'react';

import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { readsSeriesAlike } from '../../../../utils/vessels/plateSeries';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

// PITFALL: the map keeps an older calculation unless its series read differently, so map code reading any other board number will not refresh.
export function useVesselMapCalculation(block: VesselMapBlock): BoardCalculation {
  const isAlikeForMap = useCallback(
    (a: BoardCalculation, b: BoardCalculation) =>
      readsSeriesAlike(Object.values(block.series), a, b),
    [block.series]
  );
  return useStoreWithEqualityFn(useWorkbenchStore, state => state.calculation, isAlikeForMap);
}
