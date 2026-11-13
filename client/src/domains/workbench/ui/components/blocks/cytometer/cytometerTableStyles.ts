import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

export const CYTOMETER_CELL =
  'whitespace-nowrap px-2.5 py-1.5 align-middle text-body-sm tabular-nums';

export const CYTOMETER_FIELD =
  'text-body-sm text-foreground placeholder:text-muted-foreground group-hover:placeholder:text-foreground';

export const MUTED_TEXT = 'text-muted-foreground group-hover:text-foreground/80';

const TEXT_ON_HOVER = 'hover:text-foreground hover:[text-shadow:0_0_0.6px_currentColor]';

export const CYTOMETER_PICK_FIELD = `${CYTOMETER_FIELD} bg-transparent outline-none`;

const LIT_LOOK = [
  'row-glow',
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.1),hsl(var(--row-tone)/0.1))]',
  'dark:[background-image:var(--row-selected-bg)] dark:[box-shadow:var(--row-selected-shadow)]',
].join(' ');

const LIT_LOOK_ON_HOVER = [
  'row-glow',
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.16),hsl(var(--row-tone)/0.16))]',
  'dark:hover:[background-image:var(--row-selected-hover-bg),linear-gradient(0deg,hsl(var(--row-tone)/0.08),hsl(var(--row-tone)/0.08))]',
  'dark:hover:[box-shadow:var(--row-selected-hover-shadow)]',
].join(' ');

const BRIGHTER_ON_HOVER = [
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.26),hsl(var(--row-tone)/0.26))]',
  'dark:hover:[background-image:var(--row-selected-hover-bg),linear-gradient(0deg,hsl(var(--row-tone)/0.18),hsl(var(--row-tone)/0.18))]',
  'dark:hover:[box-shadow:var(--row-selected-hover-shadow)]',
].join(' ');

export const LIT_ROW = `${LIT_LOOK} ${BRIGHTER_ON_HOVER} ${TEXT_ON_HOVER}`;

export const LIT_ROW_EDGE = 'shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]';

export const HOVER_ROW_EDGE = 'group-hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]';

export const HOVER_ROW = `group ${ROW_HOVER_GLOW.primary} ${TEXT_ON_HOVER}`;

export const OPEN_ROW = `group ${LIT_LOOK_ON_HOVER} text-muted-foreground/60 ${TEXT_ON_HOVER}`;

export const LASER_LEAD =
  'relative z-[1] w-28 whitespace-nowrap border-l-[3px] border-l-[color:var(--laser)] [background:linear-gradient(color-mix(in_srgb,var(--laser)_16%,transparent),color-mix(in_srgb,var(--laser)_16%,transparent)),hsl(var(--card))] px-3 py-2 align-top';

export const FLUOROCHROME_SQUARE = 'inline-block h-2.5 w-2.5 flex-none';
