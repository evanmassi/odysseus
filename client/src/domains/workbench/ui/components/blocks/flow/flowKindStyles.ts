import type { StepKind } from '../../../../utils/flow/stepKinds';

export const FLOW_KIND_COLORS: Readonly<Record<StepKind, string>> = {
  handle: 'hsl(var(--primary))',
  clean: 'hsl(var(--color-info-text))',
  measure: 'hsl(var(--color-success-text))',
  wait: 'hsl(var(--color-warning-text))',
  other: 'hsl(var(--muted-foreground))',
};

export const FLOW_KIND_LABELS: Readonly<Record<StepKind, string>> = {
  handle: 'Handling',
  clean: 'Wash and spin',
  measure: 'Measuring',
  wait: 'Waiting',
  other: 'Other',
};

export const FLOW_PLACE_CLASSES = 'z-10 selection-glow';
export const FLOW_DONE_CLASSES = 'opacity-45';
