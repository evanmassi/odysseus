import type { CSSProperties } from 'react';

import { Tooltip } from '@shared/ui';

import { filterCenter } from '../../../../utils/cytometer/wavelengthColor';

import type { DetectorSlot, LaserGroup } from '../../../../utils/cytometer/cytometerPanel';

interface WorkbenchCytometerPeakMapProps {
  lasers: readonly LaserGroup[];
}

const CELL = 'h-[18px] w-[18px]';

const slotLabel = (slot: DetectorSlot) =>
  slot.stains
    .map(stain => [stain.fluorochrome, stain.marker].filter(Boolean).join(' · '))
    .join(', ');

export function WorkbenchCytometerPeakMap({ lasers }: WorkbenchCytometerPeakMapProps) {
  const centers = [
    ...new Set(
      lasers.flatMap(laser => laser.slots.map(slot => filterCenter(slot.detector.filter)))
    ),
  ].sort((a, b) => a - b);

  return (
    <figure className="overflow-x-auto overflow-y-hidden">
      <div
        className="grid w-max items-center gap-0.5"
        style={{ gridTemplateColumns: `auto repeat(${centers.length}, 18px)` }}
      >
        <span />
        {centers.map(center => (
          <span
            key={center}
            className="h-8 rotate-180 text-label-2xs tabular-nums text-muted-foreground [writing-mode:vertical-rl]"
          >
            {center}
          </span>
        ))}
        {lasers.map(laser => {
          const slotAt = new Map(
            laser.slots.map(slot => [filterCenter(slot.detector.filter), slot])
          );
          return [
            <span
              key={laser.name}
              className="pr-2 text-label-xs font-semibold text-[color:var(--laser)]"
              style={{ '--laser': laser.color } as CSSProperties}
            >
              {laser.name}
            </span>,
            ...centers.map(center => {
              const slot = slotAt.get(center);
              const key = `${laser.name}-${center}`;
              if (!slot) return <span key={key} className={CELL} />;
              if (!slot.stains.length) {
                return (
                  <span
                    key={key}
                    className={`${CELL} bg-[color-mix(in_srgb,var(--laser)_14%,transparent)]`}
                    style={{ '--laser': laser.color } as CSSProperties}
                  />
                );
              }
              const isClash = slot.stains.length > 1;
              return (
                <Tooltip
                  key={key}
                  content={`${slot.detector.id} ${slot.detector.filter}: ${slotLabel(slot)}`}
                >
                  <span
                    className={`${CELL} grid place-items-center text-label-2xs font-bold text-white ${
                      isClash ? 'outline outline-2 -outline-offset-1 outline-danger-text' : ''
                    }`}
                    style={{ backgroundColor: slot.color }}
                  >
                    {isClash ? slot.stains.length : ''}
                  </span>
                </Tooltip>
              );
            }),
          ];
        })}
      </div>
      <figcaption className="mt-1 text-label-2xs text-muted-foreground">
        Detector band centers, nm. Tinted squares are each laser’s detectors; a filled one is where
        a dye peaks.
      </figcaption>
    </figure>
  );
}
