import { createContext } from 'react';

import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { DonorSummary } from '../../../../utils/materials/materialDonors';
import type { LineLayer } from '../../../../utils/plateMap/plateLayers';
import type { PlateMapSheet } from '../../../../utils/plateMap/plateMapTabs';
import type { ShownPlateMap } from '../../../../utils/plateMap/shownPlateMap';
import type { PlateStain } from '../../../../utils/plateMap/stainSide';

export interface WellTooltipSource {
  card: ShownPlateMap;
  sheet: PlateMapSheet;
  layers: readonly LineLayer[];
  board: SolvedBoard;
  donorSummaries: readonly DonorSummary[];
  stains: ReadonlyMap<string, PlateStain>;
  isStainSide: boolean;
}

export const WellTooltipSourceContext = createContext<WellTooltipSource | undefined>(undefined);
