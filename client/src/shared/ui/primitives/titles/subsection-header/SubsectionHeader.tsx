/**
 * Subsection Header
 *
 * Subsection label prefixed with a section index — one tier below SectionHeader.
 */

import type { ReactNode } from 'react';

export interface SubsectionHeaderProps {
  title: ReactNode;
  /** Zero-padded section ordinal rendered before the title (e.g. 1 → "01 /"). */
  index?: number;
  meta?: ReactNode;
  className?: string;
}

export function SubsectionHeader({ title, index, meta, className }: SubsectionHeaderProps) {
  return (
    <div className={`flex items-baseline gap-2.5 ${className ?? ''}`}>
      {index !== undefined && (
        <span aria-hidden className="font-mono text-[10.5px] tracking-[0.1em] text-foreground/40">
          {String(index).padStart(2, '0')}
          <span className="pl-2.5 text-foreground/30">/</span>
        </span>
      )}
      <span className="font-mono text-[10.5px] uppercase leading-none tracking-[0.26em] text-foreground/70">
        {title}
      </span>
      {meta && (
        <span className="ml-1 font-mono text-[9.5px] uppercase leading-none tracking-[0.18em] text-foreground/35">
          {meta}
        </span>
      )}
    </div>
  );
}
