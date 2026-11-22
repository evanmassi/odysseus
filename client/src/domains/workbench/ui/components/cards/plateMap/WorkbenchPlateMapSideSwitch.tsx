import {
  TAB_ACTIVE_TEXT,
  TAB_INACTIVE_TEXT,
  TAB_INDICATOR_TRANSITION,
  TAB_TILE_HORIZONTAL,
} from '@shared/ui';

import type { PlateMapCard } from '@odysseus/shared-schemas';

type PlateMapSide = PlateMapCard['side'];

interface WorkbenchPlateMapSideSwitchProps {
  side: PlateMapSide;
  onShow: (side: PlateMapSide) => void;
}

const SIDES: ReadonlyArray<{ side: PlateMapSide; label: string }> = [
  { side: 'assay', label: 'Assay' },
  { side: 'stain', label: 'Stain' },
];

const SIDE_BUTTON =
  'relative z-10 px-3 py-1 type-name text-label-sm transition-colors duration-150';
const SLIDING_TILE = `pointer-events-none absolute inset-y-0 left-0 w-1/2 before:absolute before:inset-0 before:content-[''] dark:before:bg-scanlines ${TAB_TILE_HORIZONTAL} ${TAB_INDICATOR_TRANSITION}`;

export function WorkbenchPlateMapSideSwitch({
  side: shown,
  onShow,
}: WorkbenchPlateMapSideSwitchProps) {
  const shownIndex = SIDES.findIndex(({ side }) => side === shown);
  return (
    <span
      role="group"
      aria-label="Side"
      className="relative grid flex-none grid-cols-2 border border-line-mid"
    >
      <span
        aria-hidden
        className={SLIDING_TILE}
        style={{ transform: `translateX(${shownIndex * 100}%)` }}
      />
      {SIDES.map(({ side, label }, index) => (
        <button
          key={side}
          type="button"
          aria-pressed={index === shownIndex}
          className={`${SIDE_BUTTON} ${index === shownIndex ? TAB_ACTIVE_TEXT : TAB_INACTIVE_TEXT}`}
          onClick={() => onShow(side)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
