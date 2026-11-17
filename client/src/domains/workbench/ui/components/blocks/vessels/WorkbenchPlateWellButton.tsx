import { memo, type CSSProperties } from 'react';

import { Tooltip } from '@shared/ui';

import { wellTooltipTable } from './wellTooltipTable';

import type { WellPointerActions } from './useWellPointerActions';
import type { MergedWells } from '../../../../utils/vessels/replicateMerges';
import type { WellDensity } from '../../../../utils/vessels/vesselSizing';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';
import type { WellTooltip } from '../../../../utils/vessels/wellTooltip';

export interface PlateWellView {
  key: string;
  row: number;
  col: number;
  merged: MergedWells | undefined;
  tooltip: WellTooltip;
  shownLine: WellLine | undefined;
  isFilled: boolean;
  color: WellColor | undefined;
  stripes: Array<WellColor | undefined>;
}

interface WorkbenchPlateWellButtonProps {
  view: PlateWellView;
  density: WellDensity;
  isSelected: boolean;
  actions: WellPointerActions;
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

export const WorkbenchPlateWellButton = memo(function WorkbenchPlateWellButton({
  view,
  density,
  isSelected,
  actions,
}: WorkbenchPlateWellButtonProps) {
  const { key: wellKey, row, col, merged, tooltip, shownLine, isFilled, color, stripes } = view;
  const isNarrow = density === 'narrow';
  return (
    <Tooltip content={wellTooltipTable(tooltip)}>
      <div
        role="gridcell"
        data-well-key={wellKey}
        tabIndex={-1}
        aria-selected={isSelected}
        onPointerDown={event => actions.onPointerDown(wellKey, event)}
        onPointerEnter={() => actions.onPointerEnter(wellKey)}
        onDoubleClick={() => actions.onDoubleClick(wellKey)}
        className={`relative flex cursor-pointer items-center justify-center border py-0.5 text-foreground ${
          isFilled ? 'border-foreground/45' : 'border-foreground/15'
        } ${isSelected ? 'z-10 selection-glow' : ''} ${DENSITY_CLASSES[density]}`}
        style={{
          gridRow: `${row + 2} / span ${merged?.height ?? 1}`,
          gridColumn: `${col + 2} / span ${merged?.width ?? 1}`,
          ...colorStyle(color),
        }}
      >
        {stripes.length > 0 && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex flex-col">
            {stripes.map((stripe, slot) => (
              <i
                key={slot}
                className="h-1"
                style={{
                  backgroundColor:
                    stripe && `color-mix(in srgb, ${stripe.color} ${stripe.tint}%, transparent)`,
                }}
              />
            ))}
          </span>
        )}
        {merged && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] grid gap-1"
            style={{ gridTemplate: `repeat(${merged.height}, 1fr) / repeat(${merged.width}, 1fr)` }}
          >
            {merged.keys.map(key => (
              <i key={key} className="border border-dashed border-foreground/20" />
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
});
