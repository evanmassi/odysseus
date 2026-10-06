export type RowTone = 'primary' | 'success' | 'warning' | 'danger';

export const ROW_TONE: Record<RowTone, string> = {
  primary: '[--row-tone:var(--primary)]',
  success: '[--row-tone:var(--color-success-bg)]',
  warning: '[--row-tone:var(--color-warning-bg)]',
  danger: '[--row-tone:var(--color-danger-bg)]',
};

export const ROW_DARK_HOVER =
  'row-glow dark:hover:[background-image:var(--row-hover-bg)] dark:hover:[box-shadow:var(--row-hover-shadow)]';

export const ROW_DARK_SELECTED = [
  'row-glow',
  'dark:[background-image:var(--row-selected-bg)] dark:[box-shadow:var(--row-selected-shadow)]',
  'dark:hover:[background-image:var(--row-selected-hover-bg)] dark:hover:[box-shadow:var(--row-selected-hover-shadow)]',
].join(' ');

const LIGHT_HOVER = [
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.06),hsl(var(--row-tone)/0.06))]',
  'hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/var(--alpha-hover-stripe))]',
].join(' ');

export const ROW_HOVER_GLOW: Record<RowTone, string> = {
  primary: `${ROW_TONE.primary} ${LIGHT_HOVER} ${ROW_DARK_HOVER}`,
  success: `${ROW_TONE.success} ${LIGHT_HOVER} ${ROW_DARK_HOVER}`,
  warning: `${ROW_TONE.warning} ${LIGHT_HOVER} ${ROW_DARK_HOVER}`,
  danger: `${ROW_TONE.danger} ${LIGHT_HOVER} ${ROW_DARK_HOVER}`,
};

export const ROW_LIT_HOVER = [
  'row-glow',
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.06),hsl(var(--row-tone)/0.06))]',
  'shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/var(--alpha-hover-stripe))]',
  'dark:[background-image:var(--row-hover-bg)] dark:[box-shadow:var(--row-hover-shadow)]',
].join(' ');

export const ROW_SELECTED = [
  'row-glow',
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.1),hsl(var(--row-tone)/0.1))]',
  'shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]',
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.15),hsl(var(--row-tone)/0.15))]',
  ROW_DARK_SELECTED,
].join(' ');

export const ROW_LIT_SELECTED_HOVER = [
  'row-glow',
  '[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.15),hsl(var(--row-tone)/0.15))]',
  'shadow-[inset_3px_0_0_0_hsl(var(--row-tone))]',
  'dark:[background-image:var(--row-selected-hover-bg)] dark:[box-shadow:var(--row-selected-hover-shadow)]',
].join(' ');
