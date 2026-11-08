import type { CSSProperties, PointerEvent } from 'react';

import type { MergedWells } from '../../../../utils/vessels/replicateMerges';
import type { WellDensity } from '../../../../utils/vessels/vesselSizing';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';

interface WorkbenchPlateWellButtonProps {
  wellKey: string;
  row: number;
  col: number;
  merged: MergedWells | undefined;
  title: string;
  shownLine: WellLine | undefined;
  shortAmount: string | undefined;
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
  merged,
  title,
  shownLine,
  shortAmount,
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
      className={`relative flex cursor-pointer items-center justify-center overflow-hidden border py-0.5 ${merged ? 'rounded-[14px]' : 'rounded-[calc(var(--well-height)/2)]'} text-foreground ${
        isFilled ? 'border-foreground/45' : 'border-foreground/15'
      } ${isSelected ? 'shadow-[0_0_0_2px_hsl(var(--primary))]' : ''} ${DENSITY_CLASSES[density]}`}
      style={{
        gridRow: `${row + 2} / span ${merged?.height ?? 1}`,
        gridColumn: `${col + 2} / span ${merged?.width ?? 1}`,
        ...colorStyle(color),
      }}
    >
      {merged && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] grid gap-1"
          style={{ gridTemplate: `repeat(${merged.height}, 1fr) / repeat(${merged.width}, 1fr)` }}
        >
          {merged.keys.map(key => (
            <i key={key} className="rounded-full border border-dashed border-foreground/20" />
          ))}
        </span>
      )}
      {shownLine && density !== 'tiny' && (
        <span className="relative block max-h-full w-full overflow-hidden text-center">
          {isSnug ? (
            shortAmount && <span className="font-semibold">{shortAmount}</span>
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
