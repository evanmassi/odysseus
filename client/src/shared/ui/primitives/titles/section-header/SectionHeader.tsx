/**
 * Section Header
 *
 * Inline section title with hairline rule terminator and optional right meta.
 */

import type { ReactNode } from 'react';

export type SectionHeaderSize = 'sm' | 'md' | 'lg';

export interface SectionHeaderProps {
  title: string;
  /** Leading icon shown after the tick-mark glyph (muted). */
  icon?: ReactNode;
  meta?: ReactNode;
  rightMeta?: ReactNode;
  /** Title typography. 'lg' (14px) for tab headers; 'md' (default, 12px) for admin/dashboard surfaces; 'sm' (10px) for in-form section dividers. */
  size?: SectionHeaderSize;
  className?: string;
}

const TITLE_SIZE: Record<SectionHeaderSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[12px]',
  lg: 'text-[14px]',
};

// Leading tick glyph (tall + short bar) scaled per title size, kept at a 3:2 ratio.
const GLYPH: Record<SectionHeaderSize, { tall: string; short: string }> = {
  sm: { tall: 'h-3', short: 'h-2' },
  md: { tall: 'h-[17px]', short: 'h-[11px]' },
  lg: { tall: 'h-[17px]', short: 'h-[11px]' },
};

export function SectionHeader({
  title,
  icon,
  meta,
  rightMeta,
  size = 'md',
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2.5 pb-3.5 ${className ?? ''}`}>
      <span aria-hidden className="flex shrink-0 items-end gap-0.5">
        <span
          className={`${GLYPH[size].tall} w-[3px] bg-primary shadow-[0_0_10px_-3px_hsl(var(--primary)/0.5)]`}
        />
        <span className={`${GLYPH[size].short} w-0.5 bg-primary/45`} />
      </span>
      {icon && (
        <span
          aria-hidden
          className="phosphor-glow flex shrink-0 items-center text-muted-foreground"
        >
          {icon}
        </span>
      )}
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
          className={`absolute top-1/2 h-0.5 w-1 -translate-y-1/2 bg-foreground shadow-[0_0_6px_1px_hsl(var(--foreground)/0.7)] ${rightMeta ? 'right-20' : 'right-0'}`}
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
