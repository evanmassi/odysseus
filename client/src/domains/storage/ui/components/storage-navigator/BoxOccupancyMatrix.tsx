/**
 * Box Occupancy Matrix
 *
 * The grid thumbnail painted in each tube's smart color, row-major (1-based) so
 * it mirrors the real box layout. Shared by the navigator minimap and the
 * storage manager box rows.
 */

// deep import: avoids @domains/tubes↔@domains/storage barrel cycle
import { getTubeColorFromFields } from '@domains/tubes/utils/tubeColorCoding';

import type { GridConfiguration, RackTube } from '@odysseus/shared-schemas';

const EMPTY_CELL_COLOR = 'hsl(var(--foreground)/0.05)';

interface BoxOccupancyMatrixProps {
  gridConfig: GridConfiguration;
  tubes: RackTube[];
  /** Matrix edge length in px. */
  size?: number;
  className?: string;
}

export function BoxOccupancyMatrix({
  gridConfig,
  tubes,
  size = 48,
  className,
}: BoxOccupancyMatrixProps) {
  const { rows, cols } = gridConfig;

  const tubeByPosition = new Map<number, RackTube>();
  for (const tube of tubes) {
    tubeByPosition.set(tube.position, tube);
  }

  const cellColors = Array.from({ length: rows * cols }, (_, index) => {
    const tube = tubeByPosition.get(index + 1);
    return tube ? getTubeColorFromFields(tube).backgroundColor : EMPTY_CELL_COLOR;
  });

  return (
    <span
      aria-hidden
      className={`grid flex-none gap-px ${className ?? ''}`}
      style={{
        width: size,
        aspectRatio: '1 / 1',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {cellColors.map((color, index) => (
        <span key={index} style={{ backgroundColor: color, aspectRatio: '1 / 1' }} />
      ))}
    </span>
  );
}
