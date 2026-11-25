import { labwareOf, labwareTypeAt } from './labwareCatalog';
import { plateNameOf, otherLabwareTabNameOf } from './plateMapTabs';

import type { WellColor } from './wellContents';
import type { SampleNoun } from '../terms/termList';
import type { FlowCytometryPanel, PlateMap } from '@odysseus/shared-schemas';

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

export function plateStains(panels: readonly FlowCytometryPanel[]): PlateStain[] {
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

export function stainedWellCounts(plates: readonly PlateMap[]): Map<string, number> {
  return new Map(
    [...stainedSampleCounts(plates)].map(([stainId, byNoun]) => [
      stainId,
      [...byNoun.values()].reduce((sum, count) => sum + count, 0),
    ])
  );
}

export function stainedSampleCounts(
  plates: readonly PlateMap[]
): Map<string, Map<SampleNoun, number>> {
  const counts = new Map<string, Map<SampleNoun, number>>();
  for (const plateMap of plates) {
    for (const [key, stainId] of Object.entries(plateMap.stain)) {
      const noun = labwareOf(labwareTypeAt(plateMap, key)).kind;
      const byNoun = counts.get(stainId) ?? new Map<SampleNoun, number>();
      byNoun.set(noun, (byNoun.get(noun) ?? 0) + 1);
      counts.set(stainId, byNoun);
    }
  }
  return counts;
}

export interface StainedPlace {
  plateMapId: string;
  name: string;
  count: number;
}

export function stainedPlaces(plates: readonly PlateMap[]): Map<string, StainedPlace[]> {
  const places = new Map<string, StainedPlace[]>();
  for (const plateMap of plates) {
    const tabs = [
      ...plateMap.plates.map(plate => ({
        prefix: `${plate.id}:`,
        name: plateNameOf(plateMap, plate),
      })),
      ...plateMap.otherLabware.map(set => ({
        prefix: `${set.id}#`,
        name: otherLabwareTabNameOf(plateMap),
      })),
    ];
    for (const { prefix, name } of tabs) {
      const counts = new Map<string, number>();
      for (const [key, stainId] of Object.entries(plateMap.stain)) {
        if (key.startsWith(prefix)) counts.set(stainId, (counts.get(stainId) ?? 0) + 1);
      }
      for (const [stainId, count] of counts) {
        const list = places.get(stainId) ?? [];
        const sameName = list.find(
          place => place.plateMapId === plateMap.id && place.name === name
        );
        if (sameName) sameName.count += count;
        else list.push({ plateMapId: plateMap.id, name, count });
        places.set(stainId, list);
      }
    }
  }
  return places;
}

export function stainWells(
  card: PlateMap,
  keys: Iterable<string>,
  stainId: string | undefined
): void {
  for (const key of keys) {
    if (stainId) card.stain[key] = stainId;
    else delete card.stain[key];
  }
}

export function unpaintStains(plateMaps: readonly PlateMap[], stainIds: ReadonlySet<string>): void {
  for (const plateMap of plateMaps) {
    for (const [key, stainId] of Object.entries(plateMap.stain)) {
      if (stainIds.has(stainId)) delete plateMap.stain[key];
    }
  }
}
