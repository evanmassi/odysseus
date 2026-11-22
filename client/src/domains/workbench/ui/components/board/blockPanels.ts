import type { ComponentType } from 'react';

import { WorkbenchDilutionsPanel } from '../blocks/dilutions/WorkbenchDilutionsPanel';
import { WorkbenchFlowCytometryPanel } from '../blocks/flowCytometry/WorkbenchFlowCytometryPanel';
import { WorkbenchFlowDiagramPanel } from '../blocks/flowDiagram/WorkbenchFlowDiagramPanel';
import { WorkbenchFormulaPanel } from '../blocks/formulas/WorkbenchFormulaPanel';
import { WorkbenchMaterialsPanel } from '../blocks/materials/WorkbenchMaterialsPanel';
import { WorkbenchLinkedPlateMapCardControls } from '../blocks/plateMap/WorkbenchLinkedPlateMapCardControls';
import { WorkbenchLinkedPlateMapPanel } from '../blocks/plateMap/WorkbenchLinkedPlateMapPanel';
import { WorkbenchPlateMapCardControls } from '../blocks/plateMap/WorkbenchPlateMapCardControls';
import { WorkbenchPlateMapPanel } from '../blocks/plateMap/WorkbenchPlateMapPanel';
import { WorkbenchStepsPanel } from '../blocks/steps/WorkbenchStepsPanel';
import { WorkbenchValuesPanel } from '../blocks/values/WorkbenchValuesPanel';

import type { ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

type BlockPanels = {
  [Type in ProtocolBlockType]?: ComponentType<{ block: Extract<ProtocolBlock, { type: Type }> }>;
};

export const BLOCK_PANELS: BlockPanels = {
  materials: WorkbenchMaterialsPanel,
  steps: WorkbenchStepsPanel,
  values: WorkbenchValuesPanel,
  formula: WorkbenchFormulaPanel,
  plate: WorkbenchPlateMapPanel,
  plateView: WorkbenchLinkedPlateMapPanel,
  cytometer: WorkbenchFlowCytometryPanel,
  dilutions: WorkbenchDilutionsPanel,
  flow: WorkbenchFlowDiagramPanel,
};

export const BLOCK_HEADER_CONTROLS: BlockPanels = {
  plate: WorkbenchPlateMapCardControls,
  plateView: WorkbenchLinkedPlateMapCardControls,
};
