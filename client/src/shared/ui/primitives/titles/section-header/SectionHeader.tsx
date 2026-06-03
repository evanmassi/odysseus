/**
 * Section Header
 *
 * Inline section title with hairline rule terminator and optional right meta.
 */

import type { ReactNode } from 'react';

export type SectionHeaderSize = 'sm' | 'md';

export interface SectionHeaderProps {
  title: string;
  meta?: ReactNode;
  rightMeta?: ReactNode;
  /** Title typography. 'md' (default, 12px) for admin/dashboard surfaces; 'sm' (10px) for in-form section dividers. */
  size?: SectionHeaderSize;
  className?: string;
}

const TITLE_SIZE: Record<SectionHeaderSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[12px]',
};

export function SectionHeader({
  title,
  meta,
  rightMeta,
  size = 'md',
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2.5 pb-3.5 ${className ?? ''}`}>
      <span aria-hidden className="flex shrink-0 items-end gap-0.5">
        <span className="h-[17px] w-[3px] bg-foreground shadow-[0_0_10px_-3px_hsl(var(--foreground)/0.5)]" />
        <span className="h-[11px] w-0.5 bg-foreground/45" />
      </span>
      <span
        className={`phosphor-text font-mono ${TITLE_SIZE[size]} font-semibold uppercase tracking-[0.22em] text-foreground`}
      >
        {title}
      </span>
      {meta && (
        <>
          <span aria-hidden className="font-mono text-[12px] text-foreground/35">
            ·
          </span>
          <span className="inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            {meta}
          </span>
        </>
      )}
      <div className="relative flex flex-1 items-center">
        <span
          aria-hidden
          className="h-px flex-1 [background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.22)_30%,hsl(var(--foreground)/0.18)_85%,transparent_100%)]"
        />
        <span
          aria-hidden
          className={`absolute top-1/2 h-1 w-3 -translate-y-1/2 bg-foreground/60 ${rightMeta ? 'right-20' : 'right-1'}`}
        />
      </div>
      {rightMeta && (
        <span className="pl-4 font-mono text-[9.5px] uppercase tracking-[0.22em] text-foreground/40">
          {rightMeta}
        </span>
      )}
    </div>
  );
}
