/**
 * Section Header
 *
 * Inline section title with hairline rule terminator and optional right meta.
 */

import type { ReactNode } from 'react';

export type SectionHeaderSize = 'sm' | 'md' | 'lg';

export interface SectionHeaderProps {
  title: string;
  /** Leading icon shown after the marker glyph (muted). */
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

// Beacon glyph geometry per title size — lit box + two radiating chevrons.
const BEACON: Record<SectionHeaderSize, { box: string; c1: string; c2: string }> = {
  sm: {
    box: 'w-[17px] h-3',
    c1: 'left-[6px] w-[5px] h-[5px] border-t border-r',
    c2: 'left-[10px] w-[7px] h-[7px] border-t border-r',
  },
  md: {
    box: 'w-[21px] h-4',
    c1: 'left-[7px] w-1.5 h-1.5 border-t-[1.5px] border-r-[1.5px]',
    c2: 'left-3 w-2 h-2 border-t-[1.5px] border-r-[1.5px]',
  },
  lg: {
    box: 'w-[23px] h-[18px]',
    c1: 'left-2 w-[7px] h-[7px] border-t-[1.5px] border-r-[1.5px]',
    c2: 'left-[13px] w-[9px] h-[9px] border-t-2 border-r-2',
  },
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
      <span aria-hidden className={`relative flex shrink-0 ${BEACON[size].box}`}>
        <span className="absolute left-0 top-1/2 h-0.5 w-1 -translate-y-1/2 bg-foreground dark:shadow-[0_0_7px_1px_hsl(var(--primary)/0.75)]" />
        <span
          className={`absolute top-1/2 -translate-y-1/2 rotate-45 border-foreground/85 ${BEACON[size].c1}`}
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 rotate-45 border-foreground/45 ${BEACON[size].c2}`}
        />
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
          className={`absolute top-1/2 h-0.5 w-1 -translate-y-1/2 bg-foreground dark:shadow-[0_0_6px_1px_hsl(var(--foreground)/0.7)] ${rightMeta ? 'right-20' : 'right-0'}`}
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
