import { findFluorochromeName, isNonFluorochromeConjugate } from './materialGuesser';
import { normalizeMaterialKey } from './materialKey';

import type { MaterialItem } from '@odysseus/shared-schemas';

export interface ConjugateClash {
  color: string;
  panel: string;
  items: MaterialItem[];
}

const ISOTYPE_CONTROL = 'Isotype control';
export const CONJUGATE_FIELD = 'conjugate';
const PANEL_FIELD = 'panel';

export function conjugateClashes(items: readonly MaterialItem[]): ConjugateClash[] {
  const sharing = new Map<string, ConjugateClash>();
  for (const item of items) {
    const conjugate = (item.values[CONJUGATE_FIELD] ?? '').trim();
    if (!conjugate || item.type === ISOTYPE_CONTROL || isNonFluorochromeConjugate(conjugate)) {
      continue;
    }
    const color = findFluorochromeName(conjugate) ?? conjugate;
    const panel = (item.values[PANEL_FIELD] ?? '').trim();
    const key = `${normalizeMaterialKey(panel)}|${normalizeMaterialKey(color)}`;
    const clash = sharing.get(key) ?? { color, panel, items: [] };
    clash.items.push(item);
    sharing.set(key, clash);
  }
  return [...sharing.values()].filter(clash => clash.items.length > 1);
}
