import { createContext } from 'react';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { SourceSummary } from '../../../../utils/materials/materialSources';
import type { LineLayer } from '../../../../utils/vessels/plateLayers';
import type { StainMix } from '../../../../utils/vessels/stainSide';
import type { VesselSheet } from '../../../../utils/vessels/vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export interface WellTooltipSource {
  block: VesselMapBlock;
  sheet: VesselSheet;
  layers: readonly LineLayer[];
  calculation: BoardCalculation;
  sources: readonly SourceSummary[];
  mixes: ReadonlyMap<string, StainMix>;
  isStainSide: boolean;
}

export const WellTooltipSourceContext = createContext<WellTooltipSource | undefined>(undefined);
