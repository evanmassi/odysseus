import type { ReactNode } from 'react';

import { ScrimHalo } from '../scrim-halo/ScrimHalo';

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

const PIN_GLOW = 'bg-foreground dark:shadow-[0_0_5px_hsl(var(--foreground)/0.8)]';

interface TooltipPlaqueProps {
  children: ReactNode;
  className?: string;
}

export function TooltipPlaque({ children, className = '' }: TooltipPlaqueProps) {
  return (
    <div className={`relative isolate px-4 py-3.5 ${className}`}>
      <ScrimHalo />
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 group-data-[side=bottom]:bottom-full group-data-[side=bottom]:top-auto ${PIN_GLOW}`}
      />
      {CORNER_PINS.map(position => (
        <span
          key={position}
          aria-hidden
          className={`pointer-events-none absolute h-0.5 w-1.5 ${PIN_GLOW} ${position}`}
        />
      ))}
      {children}
    </div>
  );
}
