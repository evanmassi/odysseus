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
  stainLook: 'stained' | 'unstained' | undefined;
}

interface WorkbenchPlateWellButtonProps {
  view: PlateWellView;
  density: WellDensity;
  isSelected: boolean;
  selectedParts: string | undefined;
  actions: WellPointerActions;
}

export const PART_SEPARATOR = '|';

const keyUnder = (target: EventTarget, fallback: string) =>
  target instanceof Element
    ? (target.closest<HTMLElement>('[data-well-key]')?.dataset['wellKey'] ?? fallback)
    : fallback;

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
  selectedParts,
  actions,
}: WorkbenchPlateWellButtonProps) {
  const {
    key: wellKey,
    row,
    col,
    merged,
    tooltip,
    shownLine,
    isFilled,
    color,
    stripes,
    stainLook,
  } = view;
  const isNarrow = density === 'narrow';
  return (
    <Tooltip content={wellTooltipTable(tooltip)}>
      <div
        role="gridcell"
        data-well-key={wellKey}
        tabIndex={-1}
        aria-selected={isSelected}
        onPointerDown={event => actions.onPointerDown(keyUnder(event.target, wellKey), event)}
        onPointerOver={event => {
          const isGapInMerge = merged && event.target === event.currentTarget;
          if (!isGapInMerge) actions.onPointerEnter(keyUnder(event.target, wellKey));
        }}
        onDoubleClick={event => actions.onDoubleClick(keyUnder(event.target, wellKey))}
        onContextMenu={event => actions.onContextMenu(keyUnder(event.target, wellKey), event)}
        className={`relative flex cursor-pointer items-center justify-center border py-0.5 ${
          stainLook ? 'text-muted-foreground' : 'text-foreground'
        } ${isFilled ? 'border-foreground/45' : 'border-foreground/15'} ${
          stainLook === 'unstained' ? 'border-dashed' : ''
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
            className="pointer-events-none absolute inset-[3px] z-[5] grid gap-1"
            style={{ gridTemplate: `repeat(${merged.height}, 1fr) / repeat(${merged.width}, 1fr)` }}
          >
            {merged.keys.map(key => (
              <i
                key={key}
                data-well-key={key}
                className={`pointer-events-auto relative border border-dashed border-foreground/20 ${
                  selectedParts?.split(PART_SEPARATOR).includes(key) ? 'z-10 selection-glow' : ''
                }`}
              />
            ))}
          </span>
        )}
        {shownLine && density !== 'tiny' && (
          <span
            className={`pointer-events-none relative flex max-h-full w-full items-center overflow-hidden text-center ${
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
