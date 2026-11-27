import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

export const FLOW_CYTOMETRY_CELL =
  'whitespace-nowrap px-2.5 py-1.5 align-middle text-body-sm tabular-nums';

const HEAD_LABEL =
  'whitespace-nowrap py-2 type-label text-label-2xs font-semibold text-muted-foreground';

export const FLOW_CYTOMETRY_HEAD_CELL = `${HEAD_LABEL} px-2.5 text-left`;

export const FLOW_CYTOMETRY_NUMBER_HEAD_CELL = `${HEAD_LABEL} px-2.5 text-right`;

export const LASER_HEAD_CELL = `${HEAD_LABEL} border-l-[3px] border-l-transparent px-3 text-left`;

export const FLOW_CYTOMETRY_FIELD =
  'text-body-sm text-foreground placeholder:text-muted-foreground group-hover:placeholder:text-foreground';

export const MUTED_TEXT = 'text-muted-foreground group-hover:text-foreground/80';

const TEXT_ON_HOVER = 'hover:text-foreground hover:[text-shadow:0_0_0.6px_currentColor]';

export const FLOW_CYTOMETRY_PICK_FIELD = `${FLOW_CYTOMETRY_FIELD} bg-transparent outline-none`;

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

const SUB_LIT_LOOK = [
  'row-glow',
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.05),hsl(var(--row-tone)/0.05))]',
  'dark:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.07),hsl(var(--row-tone)/0.07))]',
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.16),hsl(var(--row-tone)/0.16))]',
  'dark:hover:[background-image:var(--row-selected-hover-bg),linear-gradient(0deg,hsl(var(--row-tone)/0.12),hsl(var(--row-tone)/0.12))]',
].join(' ');

export const SUB_LIT_ROW = `group ${SUB_LIT_LOOK} ${TEXT_ON_HOVER}`;

export const SUB_LIT_ROW_EDGE = 'shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/0.45)]';

export const HOVER_ROW_EDGE = 'group-hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]';

export const HOVER_ROW = `group ${ROW_HOVER_GLOW.primary} ${TEXT_ON_HOVER}`;

export const OPEN_ROW = `group ${LIT_LOOK_ON_HOVER} text-muted-foreground/60 ${TEXT_ON_HOVER}`;

export const LASER_LEAD =
  'relative z-[1] w-28 whitespace-nowrap border-l-[3px] border-l-[color:var(--laser)] [background:linear-gradient(color-mix(in_srgb,var(--laser)_16%,transparent),color-mix(in_srgb,var(--laser)_16%,transparent)),hsl(var(--card))] px-3 py-2 align-top';

export const FLUOR_SQUARE = 'inline-block h-2.5 w-2.5 flex-none';
