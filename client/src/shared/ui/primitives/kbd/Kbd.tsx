/**
 * Keyboard Key Cap
 *
 * Renders a single key as a console-style cap with a beveled rim and phosphor glyph.
 * Combine multiple for a chord (e.g. map over the keys, joined by a separator).
 */

import type { ReactNode } from 'react';

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className = '' }: KbdProps) {
  return (
    <kbd
      className={`phosphor-text inline-flex min-w-[1.5rem] items-center justify-center rounded-[2px] border border-line-mid bg-shade/20 px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.04em] text-secondary-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.07),0_1px_0_hsl(var(--shade)/0.4)] ${className}`}
    >
      {children}
    </kbd>
  );
}
