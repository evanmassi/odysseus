import { plateNameOf, shelfNameOf } from './vesselTabs';

import type { WellColor } from './wellContents';
import type { CytometerBlock, VesselMapBlock } from '@odysseus/shared-schemas';

export interface StainMix {
  id: string;
  name: string;
  color: string;
}

const MIX_COLORS = [
  '#f0b35b',
  '#5cc8bd',
  '#e07a8f',
  '#b48ee6',
  '#8fdcb0',
  '#e8875a',
  '#e3d36b',
  '#b8d36a',
] as const;
const NO_STAIN_COLOR = '#7d8494';
export const MIX_TINT = 40;
const STAIN_SIDE_DIM = 0.45;

export const dimmedForStain = (color: WellColor | undefined): WellColor | undefined =>
  color && { ...color, tint: Math.round(color.tint * STAIN_SIDE_DIM) };

export function stainMixes(panels: readonly CytometerBlock[]): StainMix[] {
  let colored = 0;
  return panels
    .flatMap(panel => panel.mixes)
    .map(mix => {
      const hasStains = mix.rowIds.length > 0 || mix.plus.length > 0;
      const autoColor = hasStains ? MIX_COLORS[colored++ % MIX_COLORS.length] : NO_STAIN_COLOR;
      return { id: mix.id, name: mix.name.trim() || 'Unnamed mix', color: mix.color ?? autoColor };
    });
}

export function stainedWellCounts(plates: readonly VesselMapBlock[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const plate of plates) {
    for (const mixId of Object.values(plate.stain)) counts.set(mixId, (counts.get(mixId) ?? 0) + 1);
  }
  return counts;
}

export interface StainedPlace {
  blockId: string;
  name: string;
  count: number;
}

export function stainedPlaces(plates: readonly VesselMapBlock[]): Map<string, StainedPlace[]> {
  const places = new Map<string, StainedPlace[]>();
  for (const block of plates) {
    const tabs = [
      ...block.plates.map(plate => ({ prefix: `${plate.id}:`, name: plateNameOf(block, plate) })),
      ...block.sets.map(set => ({ prefix: `${set.id}#`, name: shelfNameOf(block) })),
    ];
    for (const { prefix, name } of tabs) {
      const counts = new Map<string, number>();
      for (const [key, mixId] of Object.entries(block.stain)) {
        if (key.startsWith(prefix)) counts.set(mixId, (counts.get(mixId) ?? 0) + 1);
      }
      for (const [mixId, count] of counts) {
        const list = places.get(mixId) ?? [];
        const sameName = list.find(place => place.blockId === block.id && place.name === name);
        if (sameName) sameName.count += count;
        else list.push({ blockId: block.id, name, count });
        places.set(mixId, list);
      }
    }
  }
  return places;
}

export function stainWells(
  block: VesselMapBlock,
  keys: Iterable<string>,
  mixId: string | undefined
): void {
  for (const key of keys) {
    if (mixId) block.stain[key] = mixId;
    else delete block.stain[key];
  }
}
