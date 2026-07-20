/**
 * Occupancy Bar
 *
 * Thin filled/capacity progress bar for storage occupancy, shared by the
 * dashboard, navigator, storage manager, and help examples.
 */

interface OccupancyBarProps {
  filled: number;
  capacity: number;
  size?: 'sm' | 'lg';
  glow?: boolean;
  full?: boolean;
  className?: string;
}

export function OccupancyBar({
  filled,
  capacity,
  size = 'sm',
  glow = false,
  full = false,
  className = '',
}: OccupancyBarProps) {
  const pct = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  const fill = full
    ? 'bg-warning-bg'
    : glow
      ? 'bg-primary dark:shadow-[0_0_6px_hsl(var(--primary)/0.6)]'
      : 'bg-primary/80';

  return (
    <span
      className={`relative ${size === 'lg' ? 'h-1' : 'h-0.5'} ${className} bg-foreground/[0.07]`}
    >
      <span className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
