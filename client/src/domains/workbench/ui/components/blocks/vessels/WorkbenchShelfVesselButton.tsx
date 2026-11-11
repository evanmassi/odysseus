import { memo, type CSSProperties } from 'react';

import { Tooltip } from '@shared/ui';

import { SHAPE_METRICS, type VesselShape } from '../../../../utils/vessels/vesselSizing';

import { wellTooltipContent } from './wellTooltipContent';

import type { WellPointerActions } from './useWellPointerActions';
import type { WellColor, WellLine } from '../../../../utils/vessels/wellContents';

type PartRole = 'cap' | 'body' | 'rim';

type ShapePart =
  | { role: PartRole; rect: readonly [x: number, y: number, w: number, h: number, rx?: number] }
  | { role: PartRole; path: string }
  | { role: PartRole; circle: readonly [cx: number, cy: number, r: number] };

const SHAPE_PARTS: Readonly<Record<VesselShape, readonly ShapePart[]>> = {
  flask25: [
    { role: 'cap', rect: [18, 2, 24, 12, 2] },
    { role: 'body', rect: [22, 14, 16, 6] },
    { role: 'body', path: 'M6 34 L21 20 H39 L54 34 V84 Q54 88 50 88 H10 Q6 88 6 84 Z' },
  ],
  flask75: [
    { role: 'cap', rect: [22, 2, 20, 12, 2] },
    { role: 'body', rect: [25, 14, 14, 6] },
    { role: 'body', path: 'M4 46 Q4 21 23 20 H41 Q60 21 60 46 V90 Q60 94 56 94 H8 Q4 94 4 90 Z' },
  ],
  flask175: [
    { role: 'cap', rect: [28, 2, 20, 11, 2] },
    { role: 'body', rect: [31, 13, 14, 5] },
    { role: 'body', path: 'M4 38 Q4 19 26 18 H50 Q72 19 72 38 V94 Q72 98 68 98 H8 Q4 98 4 94 Z' },
  ],
  dish: [
    { role: 'body', circle: [50, 50, 47] },
    { role: 'rim', circle: [50, 50, 41] },
  ],
  micro: [
    { role: 'cap', rect: [0, 5, 7, 5, 1.5] },
    { role: 'cap', rect: [4, 3, 40, 8, 3] },
    { role: 'body', rect: [8, 11, 30, 4, 1] },
    { role: 'body', path: 'M9 15 H37 L35 44 L26 92 Q23 96 20 92 L11 44 Z' },
  ],
  facs: [
    { role: 'cap', rect: [2, 2, 26, 18, 2] },
    { role: 'cap', rect: [0, 19, 30, 3, 1] },
    { role: 'body', path: 'M6 22 H24 V99 A9 9 0 0 1 6 99 Z' },
  ],
  conical15: [
    { role: 'cap', rect: [3, 2, 30, 11, 2] },
    { role: 'body', path: 'M5 13 H31 V88 L22 106 Q18 110 14 106 L5 88 Z' },
  ],
  conical50: [
    { role: 'cap', rect: [2, 2, 52, 14, 3] },
    { role: 'body', path: 'M5 16 H51 V80 L33 100 Q28 104 23 100 L5 80 Z' },
  ],
};

const PART_CLASSES: Readonly<Record<PartRole, string>> = {
  cap: 'fill-foreground/15 stroke-foreground/40 [stroke-width:1.2]',
  body: 'fill-transparent stroke-foreground/40 [stroke-width:1.4] group-hover:stroke-foreground/60',
  rim: 'fill-none stroke-foreground/20 [stroke-dasharray:3_3] [stroke-width:1]',
};

export interface ShelfVesselView {
  key: string;
  shape: VesselShape;
  width: number;
  sizeLabel: string;
  tooltipLines: string[];
  lines: WellLine[];
  color: WellColor | undefined;
}

interface WorkbenchShelfVesselButtonProps {
  view: ShelfVesselView;
  isSelected: boolean;
  actions: WellPointerActions;
}

interface ShapePartElementProps {
  part: ShapePart;
  color: WellColor | undefined;
  isSelected: boolean;
}

function ShapePartElement({ part, color, isSelected }: ShapePartElementProps) {
  const isBody = part.role === 'body';
  const tinted: CSSProperties = {
    ...(color &&
      isBody && {
        fill: `color-mix(in srgb, ${color.color} ${color.tint}%, transparent)`,
        stroke: color.color,
      }),
    ...(isSelected && isBody && { stroke: 'hsl(var(--primary))', strokeWidth: 2.4 }),
  };
  const shared = {
    className: PART_CLASSES[part.role],
    style: tinted,
    vectorEffect: 'non-scaling-stroke',
  };
  if ('rect' in part) {
    const [x, y, width, height, rx] = part.rect;
    return <rect {...shared} x={x} y={y} width={width} height={height} rx={rx} />;
  }
  if ('circle' in part) {
    const [cx, cy, r] = part.circle;
    return <circle {...shared} cx={cx} cy={cy} r={r} />;
  }
  return <path {...shared} d={part.path} />;
}

export const WorkbenchShelfVesselButton = memo(function WorkbenchShelfVesselButton({
  view,
  isSelected,
  actions,
}: WorkbenchShelfVesselButtonProps) {
  const { key: wellKey, shape, width, sizeLabel, tooltipLines, lines, color } = view;
  const metrics = SHAPE_METRICS[shape];
  const [left, top, boxWidth, boxHeight] = metrics.textBox;
  return (
    <Tooltip content={wellTooltipContent(tooltipLines)} delayDuration={300}>
      <div
        role="gridcell"
        data-well-key={wellKey}
        tabIndex={-1}
        aria-selected={isSelected}
        onPointerDown={event => actions.onPointerDown(wellKey, event)}
        onPointerEnter={() => actions.onPointerEnter(wellKey)}
        onDoubleClick={() => actions.onDoubleClick(wellKey)}
        className={`group relative flex cursor-pointer flex-col items-center gap-1 ${metrics.isVertical ? 'min-w-16' : ''}`}
      >
        <div className="relative">
          <svg
            viewBox={`0 0 ${metrics.width} ${metrics.height}`}
            className="block h-auto overflow-visible"
            style={{ width }}
            aria-hidden
          >
            {SHAPE_PARTS[shape].map((part, index) => (
              <ShapePartElement key={index} part={part} color={color} isSelected={isSelected} />
            ))}
          </svg>
          <div
            className={`absolute flex flex-col items-center justify-center gap-[3px] overflow-hidden text-center text-foreground ${
              metrics.isVertical
                ? 'rotate-180 text-label-2xs leading-[13px] [writing-mode:vertical-rl]'
                : 'text-label-2xs leading-[14px]'
            }`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${boxWidth}%`,
              height: `${boxHeight}%`,
            }}
          >
            {lines.map((line, index) => (
              <span
                key={index}
                className={
                  metrics.isVertical
                    ? 'block truncate'
                    : 'flex flex-wrap justify-center gap-x-1.5 gap-y-px'
                }
              >
                {line.label && <span>{line.label}</span>}
                {line.readable && (
                  <span
                    className={metrics.isVertical ? 'ms-[.55em] font-semibold' : 'font-semibold'}
                  >
                    {line.readable}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
        <span className="font-mono text-label-2xs tracking-wide text-muted-foreground/80">
          {sizeLabel}
        </span>
      </div>
    </Tooltip>
  );
});
