/**
 * Panel
 *
 * Corner-ticked container with hairline frame. `topless` skips the top border
 * so a SectionHeader sitting above isn't fighting a competing edge line.
 */

import type { ReactNode } from 'react';

export interface PanelProps {
  children: ReactNode;
  className?: string;
  topless?: boolean;
}

const PANEL_BASE = 'relative bg-gradient-to-b from-foreground/[0.012] to-transparent to-40%';
// Non-topless panels get their own opaque card surface; topless panels stay
// transparent so a SectionHeader chip above and the table header inside both
// composite over the same page background.
const PANEL_CARD_BG = 'bg-card';

const TOP_LEFT_TICK = [
  "before:content-[''] before:absolute before:-top-px before:-left-px",
  'before:w-2.5 before:h-2.5 before:border-t before:border-l',
  'before:border-foreground/30 before:pointer-events-none',
].join(' ');

const TOP_RIGHT_TICK = [
  "after:content-[''] after:absolute after:-top-px after:-right-px",
  'after:w-2.5 after:h-2.5 after:border-t after:border-r',
  'after:border-foreground/30 after:pointer-events-none',
].join(' ');

const CORNER_TICK_CLASSES = 'absolute w-2.5 h-2.5 border-foreground/30 pointer-events-none';

export function Panel({ children, className = '', topless = false }: PanelProps) {
  const borderClasses = topless
    ? 'border-x border-b border-foreground/10'
    : 'border border-foreground/10';
  const surfaceClass = topless ? '' : PANEL_CARD_BG;
  // Topless skips the top-left tick so a SectionHeader chip anchored to the
  // left doesn't fight a competing corner mark.
  const topCornerClasses = topless ? TOP_RIGHT_TICK : `${TOP_LEFT_TICK} ${TOP_RIGHT_TICK}`;
  return (
    <div
      className={`${PANEL_BASE} ${surfaceClass} ${borderClasses} ${topCornerClasses} ${className}`}
    >
      {/* Bottom corners can't use ::before/::after (already consumed by top corners). */}
      <span
        aria-hidden
        className={`${CORNER_TICK_CLASSES} -bottom-px -left-px border-b border-l`}
      />
      <span
        aria-hidden
        className={`${CORNER_TICK_CLASSES} -bottom-px -right-px border-b border-r`}
      />
      {/* Inner clip prevents child bg fills (e.g. highlighted table rows) from
          painting over the Panel's own border. Corner ticks stay as siblings
          so they keep their -1px overhang past the border. */}
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
