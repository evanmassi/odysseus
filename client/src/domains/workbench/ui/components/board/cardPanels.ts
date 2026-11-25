import type { ComponentType } from 'react';

import { WorkbenchCalculationsPanel } from '../cards/calculations/WorkbenchCalculationsPanel';
import { WorkbenchDilutionsPanel } from '../cards/dilutions/WorkbenchDilutionsPanel';
import { WorkbenchFlowCytometryPanel } from '../cards/flowCytometry/WorkbenchFlowCytometryPanel';
import { WorkbenchFlowDiagramPanel } from '../cards/flowDiagram/WorkbenchFlowDiagramPanel';
import { WorkbenchMaterialsPanel } from '../cards/materials/WorkbenchMaterialsPanel';
import { WorkbenchPlateMapCardControls } from '../cards/plateMap/WorkbenchPlateMapCardControls';
import { WorkbenchPlateMapCardPanel } from '../cards/plateMap/WorkbenchPlateMapCardPanel';
import { WorkbenchProcedurePanel } from '../cards/procedure/WorkbenchProcedurePanel';
import { WorkbenchValuesPanel } from '../cards/values/WorkbenchValuesPanel';

import type { ProtocolCard, ProtocolCardType } from '@odysseus/shared-schemas';

type CardPanels = {
  [Type in ProtocolCardType]?: ComponentType<{ card: Extract<ProtocolCard, { type: Type }> }>;
};

export const CARD_PANELS: CardPanels = {
  materials: WorkbenchMaterialsPanel,
  procedure: WorkbenchProcedurePanel,
  values: WorkbenchValuesPanel,
  calculations: WorkbenchCalculationsPanel,
  plateMap: WorkbenchPlateMapCardPanel,
  flowCytometryPanel: WorkbenchFlowCytometryPanel,
  dilutions: WorkbenchDilutionsPanel,
  flowDiagram: WorkbenchFlowDiagramPanel,
};

export const CARD_HEADER_CONTROLS: CardPanels = {
  plateMap: WorkbenchPlateMapCardControls,
};
