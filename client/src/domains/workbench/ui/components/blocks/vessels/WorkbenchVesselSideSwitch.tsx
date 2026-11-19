import {
  TAB_ACTIVE_TEXT,
  TAB_INACTIVE_TEXT,
  TAB_INDICATOR_TRANSITION,
  TAB_TILE_HORIZONTAL,
} from '@shared/ui';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { activeTabOf } from '../../../../utils/vessels/vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchVesselSideSwitchProps {
  block: VesselMapBlock;
}

const SIDES: ReadonlyArray<{ side: VesselMapBlock['side']; label: string }> = [
  { side: 'assay', label: 'Assay' },
  { side: 'stain', label: 'Stain' },
];

const SIDE_BUTTON =
  'relative z-10 px-3 py-1 type-name text-label-sm transition-colors duration-150';
const SLIDING_TILE = `pointer-events-none absolute inset-y-0 left-0 w-1/2 before:absolute before:inset-0 before:content-[''] dark:before:bg-scanlines ${TAB_TILE_HORIZONTAL} ${TAB_INDICATOR_TRANSITION}`;

export function WorkbenchVesselSideSwitch({ block }: WorkbenchVesselSideSwitchProps) {
  const updateBlock = useUpdateBlock(block);
  if (activeTabOf(block).kind !== 'plate') return null;
  const shownIndex = SIDES.findIndex(({ side }) => side === block.side);
  return (
    <span
      role="group"
      aria-label="Plate side"
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
          onClick={() =>
            updateBlock(draft => {
              draft.side = side;
            })
          }
        >
          {label}
        </button>
      ))}
    </span>
  );
}
