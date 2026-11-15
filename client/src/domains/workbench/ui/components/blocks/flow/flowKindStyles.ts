import type { StepKind } from '../../../../utils/flow/stepKinds';

export const FLOW_HANDS_ON_COLOR = 'hsl(var(--foreground))';
export const FLOW_HANDS_OFF_COLOR = 'hsl(var(--color-warning-text))';

export const FLOW_PICTURE_COLOR = 'hsl(var(--primary))';

export const flowKindColor = (kind: StepKind): string =>
  kind === 'wait' ? FLOW_HANDS_OFF_COLOR : FLOW_HANDS_ON_COLOR;

export const flowPictureColor = (kind: StepKind): string =>
  kind === 'wait' ? FLOW_HANDS_OFF_COLOR : FLOW_PICTURE_COLOR;

export const FLOW_PLACE_CLASSES = 'z-10 selection-glow';
export const FLOW_DONE_CLASSES = 'opacity-45';
