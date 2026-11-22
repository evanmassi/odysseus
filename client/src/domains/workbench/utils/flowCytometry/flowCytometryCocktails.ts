import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { COCKTAIL } from '../terms/termList';
import { lowerLead } from '../values/valueNames';

import type { FlowCytometryPanelBlock, Stain } from '@odysseus/shared-schemas';

type PanelRow = FlowCytometryPanelBlock['rows'][number];
type StainPlus = Stain['plus'][number];

export interface Cocktail {
  key: string;
  name: string;
  stains: Stain[];
  rows: PanelRow[];
  plus: StainPlus[];
}

export interface StainingCocktails {
  staining: string;
  cocktails: Cocktail[];
  stainsWithout: Stain[];
}

export interface PanelCocktails {
  stainings: StainingCocktails[];
  rowsWithoutStaining: PanelRow[];
}

function usedStainings(block: FlowCytometryPanelBlock): string[] {
  const byKey = new Map<string, string>();
  const stainings = [
    ...block.rows.map(row => row.stain),
    ...block.mixes.flatMap(stain => stain.plus.map(plus => plus.stain)),
  ];
  for (const staining of stainings) {
    const key = normalizeMaterialKey(staining);
    if (key && !byKey.has(key)) byKey.set(key, staining.trim());
  }
  return [...byKey.values()];
}

function stainingCocktails(block: FlowCytometryPanelBlock, staining: string): StainingCocktails {
  const stainingKey = normalizeMaterialKey(staining);
  const isInStaining = (staining: string) => normalizeMaterialKey(staining) === stainingKey;
  const cocktails = new Map<string, Cocktail>();
  const stainsWithout: Stain[] = [];
  for (const stain of block.mixes) {
    const rows = block.rows.filter(row => stain.rowIds.includes(row.id) && isInStaining(row.stain));
    const plus = stain.plus.filter(entry => isInStaining(entry.stain));
    if (!rows.length && !plus.length) {
      stainsWithout.push(stain);
      continue;
    }
    const key = [
      stainingKey,
      ...rows.map(row => row.id).sort(),
      ...plus.map(entry => entry.materialId).sort(),
    ].join('|');
    const base = `${stain.name.trim()} ${staining}`.trim();
    const cocktail = cocktails.get(key) ?? {
      key,
      name: base && `${base} ${lowerLead(COCKTAIL)}`,
      stains: [],
      rows,
      plus,
    };
    cocktail.stains.push(stain);
    cocktails.set(key, cocktail);
  }
  return { staining, cocktails: [...cocktails.values()], stainsWithout };
}

export const panelCocktails = (block: FlowCytometryPanelBlock): PanelCocktails => ({
  stainings: usedStainings(block).map(staining => stainingCocktails(block, staining)),
  rowsWithoutStaining: block.rows.filter(row => !row.stain.trim()),
});
