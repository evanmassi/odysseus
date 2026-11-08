import type { CSSProperties, PointerEvent } from 'react';

import type { WellDensity } from '../../../../utils/vessels/vesselSizing';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';

interface WorkbenchPlateWellButtonProps {
  wellKey: string;
  row: number;
  col: number;
  title: string;
  shownLine: WellLine | undefined;
  isFilled: boolean;
  color: WellColor | undefined;
  density: WellDensity;
  isSnug: boolean;
  isSelected: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onPointerEnter: () => void;
  onDoubleClick: () => void;
}

const DENSITY_CLASSES: Readonly<Record<WellDensity, string>> = {
  tiny: '',
  narrow: 'rounded-[10px] px-[3px] text-label-2xs leading-[13px]',
  roomy: 'px-2.5 text-label-2xs leading-[14px]',
};

const colorStyle = (color: WellColor | undefined): CSSProperties =>
  color
    ? {
        backgroundColor: `color-mix(in srgb, ${color.color} ${color.tint}%, transparent)`,
        borderColor: `color-mix(in srgb, ${color.color} 70%, transparent)`,
      }
    : {};

export function WorkbenchPlateWellButton({
  wellKey,
  row,
  col,
  title,
  shownLine,
  isFilled,
  color,
  density,
  isSnug,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onDoubleClick,
}: WorkbenchPlateWellButtonProps) {
  const isNarrow = density === 'narrow';
  const wraps = isNarrow ? 'whitespace-normal [overflow-wrap:anywhere]' : 'whitespace-nowrap';
  return (
    <div
      role="gridcell"
      data-well-key={wellKey}
      tabIndex={-1}
      aria-selected={isSelected}
      title={title}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onDoubleClick={onDoubleClick}
      className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-[calc(var(--well-height)/2)] border py-0.5 text-foreground ${
        isFilled ? 'border-foreground/45' : 'border-foreground/15'
      } ${isSelected ? 'shadow-[0_0_0_2px_hsl(var(--primary))]' : ''} ${DENSITY_CLASSES[density]}`}
      style={{ gridRow: row + 2, gridColumn: col + 2, ...colorStyle(color) }}
    >
      {shownLine && density !== 'tiny' && (
        <span className="block max-h-full w-full overflow-hidden text-center">
          {isSnug ? (
            shownLine.amount && <span className="font-semibold">{shownLine.amount}</span>
          ) : (
            <span className={`flex flex-wrap justify-center gap-x-1.5 gap-y-px ${wraps}`}>
              {shownLine.label && (
                <span className={isNarrow ? 'max-w-full' : 'max-w-full truncate'}>
                  {shownLine.label}
                </span>
              )}
              {shownLine.readable && (
                <span className="flex-none whitespace-nowrap font-semibold">
                  {shownLine.readable}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
