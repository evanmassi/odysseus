/**
 * Bracket Header
 *
 * Quiet subsection label framed by mono brackets. One level below SectionHeader —
 * no rule, no glow bullet — used to group related rows inside an already-titled section.
 */

import type { ReactNode } from 'react';

export interface BracketHeaderProps {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function BracketHeader({ title, meta, className }: BracketHeaderProps) {
  return (
    <div className={`flex items-baseline gap-2 pb-2 ${className ?? ''}`}>
      <span aria-hidden className="font-mono text-[13px] font-light leading-none text-primary/80">
        [
      </span>
      <span className="font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.20em] text-foreground/70">
        {title}
      </span>
      <span aria-hidden className="font-mono text-[13px] font-light leading-none text-primary/80">
        ]
      </span>
      {meta && (
        <span className="ml-1 font-mono text-[9.5px] uppercase leading-none tracking-[0.18em] text-foreground/35">
          {meta}
        </span>
      )}
    </div>
  );
}
