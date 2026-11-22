import type { StepKind } from '../../../../utils/flowDiagram/stepKinds';

export const FLOW_DIAGRAM_HANDS_ON_COLOR = 'hsl(var(--foreground))';
export const FLOW_DIAGRAM_HANDS_OFF_COLOR = 'hsl(var(--color-warning-text))';

export const FLOW_DIAGRAM_PICTURE_COLOR = 'hsl(var(--primary))';

export const flowDiagramKindColor = (kind: StepKind): string =>
  kind === 'wait' ? FLOW_DIAGRAM_HANDS_OFF_COLOR : FLOW_DIAGRAM_HANDS_ON_COLOR;

export const flowDiagramPictureColor = (kind: StepKind): string =>
  kind === 'wait' ? FLOW_DIAGRAM_HANDS_OFF_COLOR : FLOW_DIAGRAM_PICTURE_COLOR;

export const FLOW_DIAGRAM_PLACE_CLASSES = 'z-10 selection-glow';
export const FLOW_DIAGRAM_DONE_CLASSES = 'opacity-45';
