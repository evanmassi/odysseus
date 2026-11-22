import { createContext } from 'react';

import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { SourceSummary } from '../../../../utils/materials/materialSources';
import type { LineLayer } from '../../../../utils/plateMap/plateLayers';
import type { PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';
import type { PlateStain } from '../../../../utils/plateMap/stainSide';
import type { PlateMapBlock } from '@odysseus/shared-schemas';

export interface WellTooltipSource {
  block: PlateMapBlock;
  sheet: PlateMapSheet;
  layers: readonly LineLayer[];
  board: SolvedBoard;
  sources: readonly SourceSummary[];
  stains: ReadonlyMap<string, PlateStain>;
  isStainSide: boolean;
}

export const WellTooltipSourceContext = createContext<WellTooltipSource | undefined>(undefined);
