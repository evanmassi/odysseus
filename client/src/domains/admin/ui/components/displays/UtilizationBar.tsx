/**
 * Utilization Bar
 *
 * Compact capacity meter — fill width and threshold tint reflect the utilization percent.
 */

interface UtilizationBarProps {
  percent: number;
}

export function UtilizationBar({ percent }: UtilizationBarProps) {
  const tone =
    percent >= 90
      ? 'bg-danger-bg dark:shadow-[0_0_6px_hsl(var(--color-danger-bg)/0.6)]'
      : percent >= 70
        ? 'bg-warning-bg dark:shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.6)]'
        : 'bg-success-bg dark:shadow-[0_0_6px_hsl(var(--color-success-bg)/0.6)]';
  const clamped = Math.min(percent, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 border border-foreground/15 bg-foreground/[0.03]">
        <div className={`h-full bg-scanlines ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="inline-block w-10 text-right font-mono text-data-sm tabular-nums tracking-data text-foreground/70">
        {percent}%
      </span>
    </div>
  );
}
