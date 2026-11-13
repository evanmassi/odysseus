import { normalizeMaterialKey } from '../materials/materialKey';

import type { CytometerBlock } from '@odysseus/shared-schemas';

type PanelRow = CytometerBlock['rows'][number];
type Mix = CytometerBlock['mixes'][number];
type MixPlus = Mix['plus'][number];

export interface Cocktail {
  key: string;
  name: string;
  mixes: Mix[];
  rows: PanelRow[];
  plus: MixPlus[];
}

export interface StainStepCocktails {
  step: string;
  cocktails: Cocktail[];
  mixesWithout: Mix[];
}

export interface PanelCocktails {
  steps: StainStepCocktails[];
  rowsWithoutStep: PanelRow[];
}

function usedSteps(block: CytometerBlock): string[] {
  const steps = new Map<string, string>();
  const stains = [
    ...block.rows.map(row => row.stain),
    ...block.mixes.flatMap(mix => mix.plus.map(plus => plus.stain)),
  ];
  for (const stain of stains) {
    const key = normalizeMaterialKey(stain);
    if (key && !steps.has(key)) steps.set(key, stain.trim());
  }
  return [...steps.values()];
}

function stepCocktails(block: CytometerBlock, step: string): StainStepCocktails {
  const stepKey = normalizeMaterialKey(step);
  const isInStep = (stain: string) => normalizeMaterialKey(stain) === stepKey;
  const cocktails = new Map<string, Cocktail>();
  const mixesWithout: Mix[] = [];
  for (const mix of block.mixes) {
    const rows = block.rows.filter(row => mix.rowIds.includes(row.id) && isInStep(row.stain));
    const plus = mix.plus.filter(entry => isInStep(entry.stain));
    if (!rows.length && !plus.length) {
      mixesWithout.push(mix);
      continue;
    }
    const key = [
      stepKey,
      ...rows.map(row => row.id).sort(),
      ...plus.map(entry => entry.materialId).sort(),
    ].join('|');
    const cocktail = cocktails.get(key) ?? {
      key,
      name: `${mix.name.trim()} ${step}`.trim(),
      mixes: [],
      rows,
      plus,
    };
    cocktail.mixes.push(mix);
    cocktails.set(key, cocktail);
  }
  return { step, cocktails: [...cocktails.values()], mixesWithout };
}

export const panelCocktails = (block: CytometerBlock): PanelCocktails => ({
  steps: usedSteps(block).map(step => stepCocktails(block, step)),
  rowsWithoutStep: block.rows.filter(row => !row.stain.trim()),
});
