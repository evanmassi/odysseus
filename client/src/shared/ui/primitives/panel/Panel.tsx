/**
 * Panel
 *
 * Corner-ticked container with hairline frame. PanelEdgeLabel is the companion
 * floating mono label that cuts through Panel's top border.
 */

import { Fragment } from 'react';
import type { ReactNode } from 'react';

export interface PanelProps {
  children: ReactNode;
  className?: string;
}

export interface PanelEdgeLabelProps {
  parts: string[];
  side?: 'left' | 'right';
  offset?: number;
}

const PANEL_CLASSES = [
  'relative',
  'bg-card bg-gradient-to-b from-foreground/[0.012] to-transparent to-40%',
  'border border-foreground/10',
  // Top corners — pseudo-elements (10×10 L-shapes at -1px offsets)
  "before:content-[''] before:absolute before:-top-px before:-left-px",
  'before:w-2.5 before:h-2.5 before:border-t before:border-l',
  'before:border-foreground/30 before:pointer-events-none',
  "after:content-[''] after:absolute after:-top-px after:-right-px",
  'after:w-2.5 after:h-2.5 after:border-t after:border-r',
  'after:border-foreground/30 after:pointer-events-none',
].join(' ');

const CORNER_TICK_CLASSES = 'absolute w-2.5 h-2.5 border-foreground/30 pointer-events-none';

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={`${PANEL_CLASSES} ${className}`}>
      {/* Bottom corners can't use ::before/::after (already consumed by top corners). */}
      <span
        aria-hidden
        className={`${CORNER_TICK_CLASSES} -bottom-px -left-px border-b border-l`}
      />
      <span
        aria-hidden
        className={`${CORNER_TICK_CLASSES} -bottom-px -right-px border-b border-r`}
      />
      {children}
    </div>
  );
}

export function PanelEdgeLabel({ parts, side = 'left', offset = 14 }: PanelEdgeLabelProps) {
  const toneClass = side === 'left' ? 'text-muted-foreground' : 'text-muted-foreground/60';
  return (
    <div
      className={`absolute -top-[7px] z-[3] flex items-center gap-2 h-3.5 px-2 bg-background font-mono uppercase tracking-[0.24em] text-[9px] leading-[14px] whitespace-nowrap ${toneClass}`}
      style={{ [side]: offset }}
    >
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground/40">·</span>}
          <span>{p}</span>
        </Fragment>
      ))}
    </div>
  );
}
