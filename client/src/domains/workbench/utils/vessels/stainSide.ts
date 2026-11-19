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
