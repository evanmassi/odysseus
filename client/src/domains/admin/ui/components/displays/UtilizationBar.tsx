import { FULLNESS_FILL, FULLNESS_GLOW } from '@shared/ui/components/info-display/fullnessClasses';
import { fullnessTone } from '@shared/utils/fullnessTone';

interface UtilizationBarProps {
  percent: number;
}

export function UtilizationBar({ percent }: UtilizationBarProps) {
  const tone = fullnessTone(percent);
  const clamped = Math.min(percent, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 border border-foreground/15 bg-foreground/[0.03]">
        <div
          className={`h-full bg-scanlines ${FULLNESS_FILL[tone]} ${FULLNESS_GLOW[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="inline-block w-10 text-right font-mono text-data-sm tabular-nums tracking-data text-foreground">
        {percent}%
      </span>
    </div>
  );
}
