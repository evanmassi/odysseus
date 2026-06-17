/**
 * Header Strip
 *
 * Recessed strip beneath a panel/modal header, terminated by a primary nub divider.
 * Holds location or meta content. Recessed cool-gray in light, a dark wash in dark.
 * Pass padding/layout via className — the strip chassis itself is fixed here.
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
      className={`relative flex-shrink-0 border-b border-line-faint bg-surface-strip shadow-[inset_0_1px_3px_hsl(var(--recess)/0.45),inset_0_0_0_1px_hsl(var(--foreground)/0.05)] dark:bg-shade/35 dark:shadow-none ${className}`}
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
