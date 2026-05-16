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

const PANEL_BASE = [
  'relative',
  'bg-card bg-gradient-to-b from-foreground/[0.012] to-transparent to-40%',
].join(' ');

const TOP_CORNER_TICKS = [
  "before:content-[''] before:absolute before:-top-px before:-left-px",
  'before:w-2.5 before:h-2.5 before:border-t before:border-l',
  'before:border-foreground/30 before:pointer-events-none',
  "after:content-[''] after:absolute after:-top-px after:-right-px",
  'after:w-2.5 after:h-2.5 after:border-t after:border-r',
  'after:border-foreground/30 after:pointer-events-none',
].join(' ');

const CORNER_TICK_CLASSES = 'absolute w-2.5 h-2.5 border-foreground/30 pointer-events-none';

export function Panel({ children, className = '', topless = false }: PanelProps) {
  const borderClasses = topless
    ? 'border-x border-b border-foreground/10'
    : 'border border-foreground/10';
  return (
    <div className={`${PANEL_BASE} ${borderClasses} ${TOP_CORNER_TICKS} ${className}`}>
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
