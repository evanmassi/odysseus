import { LOOSE_VESSELS } from './vesselCatalog';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

type PlateFormat = VesselMapBlock['plates'][number]['vessel'];
export type VesselShape = (typeof LOOSE_VESSELS)[keyof typeof LOOSE_VESSELS]['shape'];
export type WellDensity = 'tiny' | 'narrow' | 'roomy';

export interface WellSize {
  width: number;
  height: number;
  density: WellDensity;
}

export interface ShapeMetrics {
  width: number;
  height: number;
  textBox: readonly [left: number, top: number, width: number, height: number];
  isVertical: boolean;
}

const PLATE_SIZING: Readonly<
  Record<PlateFormat, { min: number; max: number; heightRatio: number }>
> = {
  '6': { min: 90, max: 160, heightRatio: 0.85 },
  '12': { min: 76, max: 140, heightRatio: 0.8 },
  '24': { min: 60, max: 120, heightRatio: 0.75 },
  '48': { min: 48, max: 100, heightRatio: 0.65 },
  '96': { min: 36, max: 96, heightRatio: 0.6 },
  '384': { min: 22, max: 52, heightRatio: 0.8 },
};

const GRID_CHROME = 42;
const WELL_GAP = 5;
const TINY_BELOW = 30;
const NARROW_BELOW = 70;
const SHORTEST_LABELED_WELL = 30;
const SHELF_PADDING = 24;
const SHELF_SCALE_RANGE = [0.5, 1.25] as const;

export const SHAPE_METRICS: Readonly<Record<VesselShape, ShapeMetrics>> = {
  flask25: { width: 60, height: 90, textBox: [12, 40, 76, 52], isVertical: false },
  flask75: { width: 64, height: 96, textBox: [10, 34, 80, 60], isVertical: false },
  flask175: { width: 76, height: 100, textBox: [9, 28, 82, 66], isVertical: false },
  dish: { width: 100, height: 100, textBox: [14, 14, 72, 72], isVertical: false },
  micro: { width: 46, height: 98, textBox: [24, 17, 52, 58], isVertical: true },
  facs: { width: 30, height: 110, textBox: [20, 22, 60, 68], isVertical: true },
  conical15: { width: 36, height: 110, textBox: [16, 14, 70, 64], isVertical: true },
  conical50: { width: 56, height: 106, textBox: [12, 18, 80, 56], isVertical: true },
};

const clamp = (value: number, [low, high]: readonly [number, number]) =>
  Math.max(low, Math.min(high, value));

export function wellSizeFor(format: PlateFormat, roomWidth: number, cols: number): WellSize {
  const { min, max, heightRatio } = PLATE_SIZING[format];
  const width = clamp(Math.floor((roomWidth - GRID_CHROME) / cols - WELL_GAP), [min, max]);
  const scaled = Math.round(width * heightRatio);
  const isTiny = width < TINY_BELOW;
  return {
    width,
    height: isTiny ? scaled : Math.max(SHORTEST_LABELED_WELL, scaled),
    density: isTiny ? 'tiny' : width < NARROW_BELOW ? 'narrow' : 'roomy',
  };
}

export function shelfScaleFor(block: VesselMapBlock, roomWidth: number): number {
  const widest = Math.max(
    ...block.sets.map(set => {
      const vessel = LOOSE_VESSELS[set.vessel];
      return SHAPE_METRICS[vessel.shape].width * vessel.scale;
    })
  );
  return clamp((roomWidth - SHELF_PADDING) / widest, SHELF_SCALE_RANGE);
}
