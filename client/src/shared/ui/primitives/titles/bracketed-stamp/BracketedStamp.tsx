/**
 * Bracketed Stamp
 *
 * Tab-level title chip framed by mono brackets, with optional meta and trailing actions.
 */

import type { ReactNode } from 'react';

export interface BracketedStampProps {
  title: ReactNode;
  meta?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function BracketedStamp({ title, meta, icon, actions, className }: BracketedStampProps) {
  return (
    <div className={`flex items-baseline gap-3 ${className ?? ''}`}>
      <div className="flex items-baseline gap-2">
        <span aria-hidden className="font-mono text-[18px] font-light text-primary">
          [
        </span>
        <span className="inline-flex items-center gap-2 self-center">
          {icon && (
            <span aria-hidden className="inline-flex items-center text-foreground/45">
              {icon}
            </span>
          )}
          <span className="inline-flex items-center gap-2 font-mono text-[14px] font-medium tracking-[0.16em] uppercase text-foreground">
            {title}
          </span>
        </span>
        <span aria-hidden className="font-mono text-[18px] font-light text-primary">
          ]
        </span>
      </div>
      {meta && (
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/40">
          {meta}
        </span>
      )}
      <div
        aria-hidden
        className="relative h-px flex-1 self-center bg-gradient-to-r from-foreground/15 to-transparent"
      >
        <span aria-hidden className="absolute -top-1 right-1 h-2 w-px bg-foreground/15" />
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
