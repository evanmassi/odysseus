/**
 * Row Hover Glow
 *
 * Hover-preview recipe for full-width ledger rows (data Table rows, detail rows):
 * light is a flat tone tint + soft leading stripe; the lit recipe (scanline +
 * directional wash + 8-layer bloom) is restored under `dark:`. One literal recipe
 * keyed to --row-tone, with a static per-tone setter class — Tailwind's JIT won't
 * emit interpolated classes, but every string here is a compile-time constant.
 */

type RowHoverTone = 'primary' | 'success' | 'warning' | 'danger';

const GLOW_RECIPE = [
  'hover:[background-image:linear-gradient(0deg,hsl(var(--row-tone)/0.06),hsl(var(--row-tone)/0.06))]',
  'hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/var(--alpha-hover-stripe))]',
  'dark:hover:[background-image:var(--scanline-layer),var(--glow-hover-wash)]',
  'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--row-tone)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--row-tone)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--row-tone)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--row-tone)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--row-tone)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--row-tone)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--row-tone)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--row-tone)/var(--alpha-hover-bloom-far))]',
].join(' ');

export const ROW_HOVER_GLOW: Record<RowHoverTone, string> = {
  primary: `[--row-tone:var(--primary)] ${GLOW_RECIPE}`,
  success: `[--row-tone:var(--color-success-bg)] ${GLOW_RECIPE}`,
  warning: `[--row-tone:var(--color-warning-bg)] ${GLOW_RECIPE}`,
  danger: `[--row-tone:var(--color-danger-bg)] ${GLOW_RECIPE}`,
};
