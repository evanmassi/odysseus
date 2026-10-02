type RowHoverTone = 'primary' | 'success' | 'warning' | 'danger';

const GLOW_RECIPE = [
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.06),hsl(var(--row-tone)/0.06))]',
  'hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/var(--alpha-hover-stripe))]',
  'dark:hover:[background-image:var(--scanline-layer),linear-gradient(90deg,hsl(var(--row-tone)/0.06)_0%,hsl(var(--row-tone)/0.025)_55%,transparent_100%)]',
].join(' ');

export const ROW_HOVER_GLOW: Record<RowHoverTone, string> = {
  primary: `[--row-tone:var(--primary)] ${GLOW_RECIPE}`,
  success: `[--row-tone:var(--color-success-bg)] ${GLOW_RECIPE}`,
  warning: `[--row-tone:var(--color-warning-bg)] ${GLOW_RECIPE}`,
  danger: `[--row-tone:var(--color-danger-bg)] ${GLOW_RECIPE}`,
};
