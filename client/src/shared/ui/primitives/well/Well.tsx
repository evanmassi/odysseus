/**
 * Well
 *
 * Recessed surface — a sunken, inset tile matching the app's input wells and empty
 * grid cells. Pass onClick to render an interactive button that lights up on hover.
 */
import type { ReactNode } from 'react';

const WELL_BASE =
  'border border-line-faint bg-shade/20 ' +
  'shadow-[inset_0_1px_3px_hsl(var(--shade)/0.45),inset_0_0_0_1px_hsl(var(--foreground)/0.04)]';

const WELL_INTERACTIVE =
  'cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-primary/40 ' +
  'hover:shadow-[inset_0_1px_3px_hsl(var(--shade)/0.45),inset_0_0_0_1px_hsl(var(--primary)/0.18),0_0_18px_-6px_hsl(var(--primary)/0.55)]';

export interface WellProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

export function Well({ children, className = '', onClick, 'aria-label': ariaLabel }: WellProps) {
  const classes = `${WELL_BASE} ${onClick ? WELL_INTERACTIVE : ''} ${className}`.trim();

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={classes}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
