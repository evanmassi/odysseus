import { memo, type CSSProperties } from 'react';

import { Tooltip } from '@shared/ui';

import { WorkbenchWellTooltip } from './WorkbenchWellTooltip';

import type { WellPointerActions } from './useWellPointerActions';
import type { MergedWells } from '../../../../utils/vessels/replicateMerges';
import type { WellDensity } from '../../../../utils/vessels/vesselSizing';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';

export interface PlateWellView {
  key: string;
  row: number;
  col: number;
  merged: MergedWells | undefined;
  tooltipHeading: string;
  shownLine: WellLine | undefined;
  isFilled: boolean;
  color: WellColor | undefined;
  stripes: Array<WellColor | undefined>;
  stainLook: 'stained' | 'unstained' | undefined;
  ringColor: string | undefined;
  poolSize: number | undefined;
}

export type WellMarks = string | undefined;

interface WorkbenchPlateWellButtonProps {
  view: PlateWellView;
  density: WellDensity;
  selected: WellMarks;
  cut: WellMarks;
  copied: WellMarks;
  actions: WellPointerActions;
}

export const PART_SEPARATOR = '|';
export const WHOLE_WELL = '*';

const RING_WIDTH = 3;

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
  selected,
  cut,
  copied,
  actions,
}: WorkbenchPlateWellButtonProps) {
  const {
    key: wellKey,
    row,
    col,
    merged,
    tooltipHeading,
    shownLine,
    isFilled,
    color,
    stripes,
    stainLook,
    ringColor,
    poolSize,
  } = view;
  const isPart = (marks: WellMarks, key: string) =>
    marks !== WHOLE_WELL && !!marks?.split(PART_SEPARATOR).includes(key);
  const isNarrow = density === 'narrow';
  return (
    <Tooltip content={<WorkbenchWellTooltip wellKey={wellKey} heading={tooltipHeading} />}>
      <div
        role="gridcell"
        data-well-key={wellKey}
        tabIndex={-1}
        aria-selected={selected === WHOLE_WELL}
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
        } ${selected === WHOLE_WELL ? 'z-10 selection-glow' : ''} ${
          cut === WHOLE_WELL ? 'clipboard-cut' : ''
        } ${DENSITY_CLASSES[density]}`}
        style={{
          gridRow: `${row + 2} / span ${merged?.height ?? 1}`,
          gridColumn: `${col + 2} / span ${merged?.width ?? 1}`,
          ...colorStyle(color),
          ...(ringColor && { borderColor: ringColor, borderWidth: RING_WIDTH }),
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
                  isPart(selected, key) ? 'z-10 selection-glow' : ''
                } ${isPart(cut, key) ? 'bg-background/50' : ''}`}
              >
                {isPart(copied, key) && <span className="clipboard-ants" />}
              </i>
            ))}
          </span>
        )}
        {copied === WHOLE_WELL && <span aria-hidden className="clipboard-ants" />}
        {poolSize !== undefined && (
          <span className="pointer-events-none absolute bottom-0 right-0.5 z-[6] font-mono text-label-2xs font-semibold leading-none text-foreground [text-shadow:0_0_3px_hsl(var(--background))]">
            ×{poolSize}
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
