import { plateNameOf, otherLabwareTabNameOf } from './plateMapTabs';

import type { WellColor } from './wellContents';
import type { FlowCytometryPanelCard, PlateMapCard } from '@odysseus/shared-schemas';

export interface PlateStain {
  id: string;
  name: string;
  color: string;
}

const STAIN_COLORS = [
  '#f0b35b',
  '#5cc8bd',
  '#e07a8f',
  '#b48ee6',
  '#8fdcb0',
  '#e8875a',
  '#e3d36b',
  '#b8d36a',
] as const;
const EMPTY_STAIN_COLOR = '#7d8494';
export const STAIN_TINT = 40;
const STAIN_SIDE_DIM = 0.45;

export const dimmedForStain = (color: WellColor | undefined): WellColor | undefined =>
  color && { ...color, tint: Math.round(color.tint * STAIN_SIDE_DIM) };

export function plateStains(panels: readonly FlowCytometryPanelCard[]): PlateStain[] {
  let colored = 0;
  return panels
    .flatMap(panel => panel.stains)
    .map(stain => {
      const hasStains = stain.markerIds.length > 0 || stain.plus.length > 0;
      const autoColor = hasStains
        ? STAIN_COLORS[colored++ % STAIN_COLORS.length]
        : EMPTY_STAIN_COLOR;
      return {
        id: stain.id,
        name: stain.name.trim() || 'Unnamed stain',
        color: stain.color ?? autoColor,
      };
    });
}

export function stainedWellCounts(plates: readonly PlateMapCard[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const plateMap of plates) {
    for (const stainId of Object.values(plateMap.stain))
      counts.set(stainId, (counts.get(stainId) ?? 0) + 1);
  }
  return counts;
}

export interface StainedPlace {
  cardId: string;
  name: string;
  count: number;
}

export function stainedPlaces(plates: readonly PlateMapCard[]): Map<string, StainedPlace[]> {
  const places = new Map<string, StainedPlace[]>();
  for (const card of plates) {
    const tabs = [
      ...card.plates.map(plate => ({ prefix: `${plate.id}:`, name: plateNameOf(card, plate) })),
      ...card.otherLabware.map(set => ({
        prefix: `${set.id}#`,
        name: otherLabwareTabNameOf(card),
      })),
    ];
    for (const { prefix, name } of tabs) {
      const counts = new Map<string, number>();
      for (const [key, stainId] of Object.entries(card.stain)) {
        if (key.startsWith(prefix)) counts.set(stainId, (counts.get(stainId) ?? 0) + 1);
      }
      for (const [stainId, count] of counts) {
        const list = places.get(stainId) ?? [];
        const sameName = list.find(place => place.cardId === card.id && place.name === name);
        if (sameName) sameName.count += count;
        else list.push({ cardId: card.id, name, count });
        places.set(stainId, list);
      }
    }
  }
  return places;
}

export function stainWells(
  card: PlateMapCard,
  keys: Iterable<string>,
  stainId: string | undefined
): void {
  for (const key of keys) {
    if (stainId) card.stain[key] = stainId;
    else delete card.stain[key];
  }
}
