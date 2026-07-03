/**
 * Completeness Meter
 *
 * Header-strip progress indicator showing how many of a form's tracked fields
 * are filled.
 */

import { HeaderStrip } from '../../primitives/header-strip/HeaderStrip';

interface CompletenessMeterProps {
  filled: number;
  total: number;
}

export function CompletenessMeter({ filled, total }: CompletenessMeterProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <HeaderStrip className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
          <span
            aria-hidden
            className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
          />
          Completeness
        </span>
        <span className="font-mono text-data-sm tracking-[0.06em] text-foreground">
          {filled}/{total}
        </span>
        <span className="relative h-1 w-20 overflow-hidden bg-foreground/10">
          <span
            className="absolute inset-y-0 left-0 bg-primary/70 dark:shadow-[0_0_6px_hsl(var(--primary)/0.5)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>
    </HeaderStrip>
  );
}
