import { createContext } from 'react';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { SourceSummary } from '../../../../utils/materials/materialSources';
import type { LineLayer } from '../../../../utils/vessels/plateLayers';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export interface WellTooltipSource {
  block: VesselMapBlock;
  layers: readonly LineLayer[];
  calculation: BoardCalculation;
  sources: readonly SourceSummary[];
}

export const WellTooltipSourceContext = createContext<WellTooltipSource | undefined>(undefined);
