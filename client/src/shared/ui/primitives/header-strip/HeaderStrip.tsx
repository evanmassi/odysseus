import type { ReactNode } from 'react';

import { Divider, type DividerTone } from '../divider/Divider';

interface HeaderStripProps {
  children: ReactNode;
  className?: string;
  tone?: DividerTone;
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
      <Divider tone={tone} className="absolute inset-x-0 -bottom-px" />
    </div>
  );
}
