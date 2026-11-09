import type { CSSProperties, PointerEvent } from 'react';

import { Tooltip } from '@shared/ui';

import { wellTooltipContent } from './wellTooltipContent';

import type { MergedWells } from '../../../../utils/vessels/replicateMerges';
import type { WellDensity } from '../../../../utils/vessels/vesselSizing';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';

interface WorkbenchPlateWellButtonProps {
  wellKey: string;
  row: number;
  col: number;
  merged: MergedWells | undefined;
  tooltipLines: string[];
  shownLine: WellLine | undefined;
  isFilled: boolean;
  color: WellColor | undefined;
  density: WellDensity;
  isSelected: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onPointerEnter: () => void;
  onDoubleClick: () => void;
}

const DENSITY_CLASSES: Readonly<Record<WellDensity, string>> = {
  tiny: '',
  narrow: 'px-[3px] text-label-2xs leading-[13px]',
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
  tooltipLines,
  shownLine,
  isFilled,
  color,
  density,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onDoubleClick,
}: WorkbenchPlateWellButtonProps) {
  const isNarrow = density === 'narrow';
  return (
    <Tooltip content={wellTooltipContent(tooltipLines)} delayDuration={300}>
      <div
        role="gridcell"
        data-well-key={wellKey}
        tabIndex={-1}
        aria-selected={isSelected}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onDoubleClick={onDoubleClick}
        className={`relative flex cursor-pointer items-center justify-center overflow-hidden border py-0.5 text-foreground ${merged ? '' : 'rounded-full'} ${
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
          <span
            className={`relative flex max-h-full w-full items-center overflow-hidden text-center ${
              isNarrow ? 'flex-col-reverse' : 'flex-col'
            }`}
          >
            {shownLine.label && (
              <span className={`max-w-full truncate ${isNarrow ? 'text-muted-foreground' : ''}`}>
                {shownLine.label}
              </span>
            )}
            {shownLine.readable && (
              <span
                className={`max-w-full font-semibold ${isNarrow ? 'leading-[12px]' : 'truncate'}`}
              >
                {shownLine.readable}
              </span>
            )}
          </span>
        )}
      </div>
    </Tooltip>
  );
}
