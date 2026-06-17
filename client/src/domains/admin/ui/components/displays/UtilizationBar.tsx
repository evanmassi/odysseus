/**
 * Utilization Bar
 *
 * Compact capacity meter — fill width and threshold tint reflect the utilization percent.
 */

export interface UtilizationBarProps {
  percent: number;
  /** Tailwind width class for the meter track. Narrow it for nested/compact rows. */
  width?: string;
}

export function UtilizationBar({ percent, width = 'w-20' }: UtilizationBarProps) {
  const tone =
    percent >= 90
      ? 'bg-danger-bg dark:shadow-[0_0_6px_hsl(var(--color-danger-bg)/0.6)]'
      : percent >= 70
        ? 'bg-warning-bg dark:shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.6)]'
        : 'bg-success-bg dark:shadow-[0_0_6px_hsl(var(--color-success-bg)/0.6)]';
  const clamped = Math.min(percent, 100);
  return (
    <div className="flex items-center gap-2">
      <div className={`relative h-1.5 ${width} border border-foreground/15 bg-foreground/[0.03]`}>
        <div className={`h-full bg-scanlines ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="font-mono text-[10px] tracking-[0.04em] text-foreground/70">{percent}%</span>
    </div>
  );
}
