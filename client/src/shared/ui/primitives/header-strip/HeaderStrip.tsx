/**
 * Header Strip
 *
 * Strip beneath a panel/modal header, terminated by a nub divider; holds location or meta
 * content. Pass padding/layout via className — the chassis itself is fixed here.
 */

import type { ReactNode } from 'react';

import { NubDivider, type NubDividerTone } from '../nub-divider/NubDivider';

export interface HeaderStripProps {
  children: ReactNode;
  className?: string;
  /** Tone of the terminating nub divider. */
  tone?: NubDividerTone;
}

export function HeaderStrip({ children, className = '', tone = 'primary' }: HeaderStripProps) {
  return (
    <div
      className={`relative flex-shrink-0 border-b border-line-faint bg-surface-strip dark:bg-shade/35 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
      />
      {children}
      <NubDivider tone={tone} className="absolute inset-x-0 -bottom-px" />
    </div>
  );
}
