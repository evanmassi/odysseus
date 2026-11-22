import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { COCKTAIL } from '../terms/termList';
import { lowerLead } from '../values/valueNames';

import type { FlowCytometryPanelCard, Stain } from '@odysseus/shared-schemas';

type PanelRow = FlowCytometryPanelCard['rows'][number];
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

function usedStainings(card: FlowCytometryPanelCard): string[] {
  const byKey = new Map<string, string>();
  const stainings = [
    ...card.rows.map(row => row.stain),
    ...card.mixes.flatMap(stain => stain.plus.map(plus => plus.stain)),
  ];
  for (const staining of stainings) {
    const key = normalizeMaterialKey(staining);
    if (key && !byKey.has(key)) byKey.set(key, staining.trim());
  }
  return [...byKey.values()];
}

function stainingCocktails(card: FlowCytometryPanelCard, staining: string): StainingCocktails {
  const stainingKey = normalizeMaterialKey(staining);
  const isInStaining = (staining: string) => normalizeMaterialKey(staining) === stainingKey;
  const cocktails = new Map<string, Cocktail>();
  const stainsWithout: Stain[] = [];
  for (const stain of card.mixes) {
    const rows = card.rows.filter(row => stain.rowIds.includes(row.id) && isInStaining(row.stain));
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

export const panelCocktails = (card: FlowCytometryPanelCard): PanelCocktails => ({
  stainings: usedStainings(card).map(staining => stainingCocktails(card, staining)),
  rowsWithoutStaining: card.rows.filter(row => !row.stain.trim()),
});
