/**
 * Console Header Surface
 *
 * Shared background recipe for console header bars — the data Table's header/toolbar
 * and the settings Subsection headers. Light is a flat faint-navy tint over the card;
 * the sheen + corner glow are --lit-gated, so they show only in dark. `lit` adds the
 * directional corner glow to the topmost bar so the light reads once across the top.
 */

const HEADER_SHEEN =
  'linear-gradient(180deg, hsl(var(--foreground) / calc(0.025 * var(--lit))) 0%, transparent 35%)';
const HEADER_GLOW = [
  'radial-gradient(ellipse 65% 120% at 0% 0%, hsl(var(--foreground) / calc(0.05 * var(--lit))), transparent 60%)',
  'radial-gradient(ellipse 60% 120% at 100% 100%, hsl(var(--foreground) / calc(0.035 * var(--lit))), transparent 70%)',
];
// Light-only faint navy wash over the base (matches the open category fill); the
// (1 - --lit) gate zeroes it in dark so the chrome there is unchanged.
const HEADER_TINT =
  'linear-gradient(0deg, hsl(var(--primary) / calc(0.07 * (1 - var(--lit)))), hsl(var(--primary) / calc(0.07 * (1 - var(--lit)))))';
const HEADER_BASE = 'color-mix(in srgb, hsl(var(--card)) var(--header-mix), black)';

/** Inner top rim that catches the light on the header's leading edge. */
export const HEADER_TOP_EDGE = 'inset 0 1px 0 hsl(var(--foreground) / var(--alpha-header-rim))';

/** Stacked `background` value for a console header bar; `lit` adds the corner glow (dark-only). */
export const headerSurface = (lit: boolean): string =>
  [HEADER_SHEEN, ...(lit ? HEADER_GLOW : []), HEADER_TINT, HEADER_BASE].join(', ');
