import { fullnessTone } from '@shared/utils/fullnessTone';

import { FULLNESS_FILL, FULLNESS_GLOW } from './fullnessClasses';

interface OccupancyBarProps {
  filled: number;
  capacity: number;
  size?: 'sm' | 'lg';
  glow?: boolean;
  className?: string;
}

export function OccupancyBar({
  filled,
  capacity,
  size = 'sm',
  glow = false,
  className = '',
}: OccupancyBarProps) {
  const percent = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  const tone = fullnessTone(percent);

  return (
    <span
      className={`relative ${size === 'lg' ? 'h-1' : 'h-0.5'} ${className} bg-foreground/[0.07]`}
    >
      <span
        className={`absolute inset-y-0 left-0 ${FULLNESS_FILL[tone]} ${glow ? FULLNESS_GLOW[tone] : ''}`}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
