import type { ComponentType } from 'react';

import { WorkbenchDilutionsPanel } from '../blocks/dilutions/WorkbenchDilutionsPanel';
import { WorkbenchFormulaPanel } from '../blocks/formulas/WorkbenchFormulaPanel';
import { WorkbenchMaterialsPanel } from '../blocks/materials/WorkbenchMaterialsPanel';
import { WorkbenchStepsPanel } from '../blocks/steps/WorkbenchStepsPanel';
import { WorkbenchValuesPanel } from '../blocks/values/WorkbenchValuesPanel';
import { WorkbenchVesselMapPanel } from '../blocks/vessels/WorkbenchVesselMapPanel';

import type { ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

type BlockPanels = {
  [Type in ProtocolBlockType]?: ComponentType<{ block: Extract<ProtocolBlock, { type: Type }> }>;
};

export const BLOCK_PANELS: BlockPanels = {
  materials: WorkbenchMaterialsPanel,
  steps: WorkbenchStepsPanel,
  values: WorkbenchValuesPanel,
  formula: WorkbenchFormulaPanel,
  plate: WorkbenchVesselMapPanel,
  dilutions: WorkbenchDilutionsPanel,
};
