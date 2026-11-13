export const CYTOMETER_CELL =
  'whitespace-nowrap px-2.5 py-1.5 align-middle text-body-sm tabular-nums';

export const CYTOMETER_FIELD = 'text-body-sm text-foreground placeholder:text-muted-foreground';

export const CYTOMETER_PICK_FIELD = `${CYTOMETER_FIELD} bg-transparent outline-none`;

export const LIT_ROW =
  'row-glow [background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.1),hsl(var(--row-tone)/0.1))] dark:[background-image:var(--row-selected-bg)] dark:[box-shadow:var(--row-selected-shadow)]';

export const LIT_ROW_EDGE = 'shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]';

export const OPEN_ROW = 'text-muted-foreground/60';

export const LASER_LEAD =
  'relative z-[1] w-28 whitespace-nowrap border-l-[3px] border-l-[color:var(--laser)] [background:linear-gradient(color-mix(in_srgb,var(--laser)_16%,transparent),color-mix(in_srgb,var(--laser)_16%,transparent)),hsl(var(--card))] px-3 py-2 align-top';

export const FLUOROCHROME_SQUARE = 'inline-block h-2.5 w-2.5 flex-none';
