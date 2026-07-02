/**
 * Panel Header
 *
 * Tab-level title on a lit filled tab, with a trailing rule and optional meta and actions.
 */

import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: ReactNode;
  meta?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const EDGE_BAR =
  'absolute inset-y-0 w-0.5 bg-primary dark:shadow-[0_0_11px_0_hsl(var(--primary)/0.9)]';

export function PanelHeader({ title, meta, icon, actions, className }: PanelHeaderProps) {
  return (
    <div className={`flex items-center ${className ?? ''}`}>
      <span className="relative isolate inline-flex flex-none items-center gap-2.5 px-[18px] py-[7px] dark:[background:linear-gradient(90deg,hsl(var(--primary)/0.14),hsl(var(--primary)/0.02)_50%,hsl(var(--primary)/0.14))] before:pointer-events-none before:absolute before:inset-0 before:-z-10 dark:before:bg-scanlines before:content-['']">
        <span aria-hidden className={`${EDGE_BAR} left-0`} />
        <span aria-hidden className={`${EDGE_BAR} right-0`} />
        {icon && (
          <span aria-hidden className="inline-flex flex-none items-center text-foreground/55">
            {icon}
          </span>
        )}
        <span className="phosphor-text inline-flex items-center gap-2 whitespace-nowrap type-label text-label-md font-medium text-foreground">
          {title}
        </span>
      </span>
      {meta && <span className="ml-3 type-label text-label-xs text-foreground/40">{meta}</span>}
      <div
        aria-hidden
        className="relative h-px flex-1 self-center [background:linear-gradient(to_right,hsl(var(--foreground)/0.18),hsl(var(--foreground)/0.1)_55%,transparent)]"
      >
        <span
          aria-hidden
          className="absolute right-0 top-1/2 h-0.5 w-1 -translate-y-1/2 bg-foreground dark:shadow-[0_0_6px_1px_hsl(var(--foreground)/0.7)]"
        />
      </div>
      {actions && <div className="ml-3 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
