import { HeaderStrip } from '../../primitives/header-strip/HeaderStrip';

import { StripLabel } from './StripLabel';

interface CompletenessMeterProps {
  filled: number;
  total: number;
  isInline?: boolean;
}

export function CompletenessMeter({ filled, total, isInline = false }: CompletenessMeterProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const gauge = (
    <>
      <span className="font-mono text-data-sm tracking-[0.06em] text-foreground">
        {filled}/{total}
      </span>
      <span className="relative h-1 w-20 overflow-hidden bg-foreground/10">
        <span
          className="absolute inset-y-0 left-0 bg-primary/70 dark:shadow-[0_0_6px_hsl(var(--primary)/0.5)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </span>
    </>
  );

  if (isInline) {
    return (
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          Completeness
        </span>
        <div className="flex items-center gap-2.5">{gauge}</div>
      </div>
    );
  }

  return (
    <HeaderStrip className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <StripLabel>Completeness</StripLabel>
        {gauge}
      </div>
    </HeaderStrip>
  );
}
