/**
 * Section Header
 *
 * Bracketed inline title — `[ TITLE ] meta · meta ──── ▭ ─── right-meta`.
 * No chip, no fill: hairline rule + marker square punctuate. Title carries
 * phosphor glow so it stays the visual anchor when chrome is stripped.
 */

import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  title: string;
  meta?: ReactNode;
  rightMeta?: string;
  className?: string;
}

export function SectionHeader({ title, meta, rightMeta, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3.5 pb-3.5 ${className ?? ''}`}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 bg-foreground/80 shadow-[0_0_6px_hsl(var(--foreground)/0.5)]"
      />
      <span className="phosphor-text font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground">
        {title}
      </span>
      {meta && (
        <>
          <span aria-hidden className="font-mono text-[12px] text-foreground/35">
            ·
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            {meta}
          </span>
        </>
      )}
      <div className="relative flex flex-1 items-center">
        {/* 8px notch — covers the rule with page bg, creating the visual gap */}
        <span
          aria-hidden
          className="absolute left-0 top-1/2 z-10 h-px w-2 -translate-y-1/2 bg-background"
        />
        <span aria-hidden className="h-px flex-1 bg-foreground/15" />
        {/* Marker square hangs on the rule; sits further left when rightMeta is
            present so the rule has a visible tail between marker and text. */}
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
