import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { findFluorName, isNonFluorConjugate } from './materialGuesser';

import type { MaterialItem } from '@odysseus/shared-schemas';

export interface ConjugateConflict {
  color: string;
  panel: string;
  items: MaterialItem[];
}

const ISOTYPE_CONTROL = 'Isotype control';
export const CONJUGATE_FIELD = 'conjugate';
const PANEL_FIELD = 'panel';

export function conjugateConflicts(items: readonly MaterialItem[]): ConjugateConflict[] {
  const sharing = new Map<string, ConjugateConflict>();
  for (const item of items) {
    const conjugate = (item.values[CONJUGATE_FIELD] ?? '').trim();
    if (!conjugate || item.type === ISOTYPE_CONTROL || isNonFluorConjugate(conjugate)) {
      continue;
    }
    const color = findFluorName(conjugate) ?? conjugate;
    const panel = (item.values[PANEL_FIELD] ?? '').trim();
    const key = `${normalizeMaterialKey(panel)}|${normalizeMaterialKey(color)}`;
    const conflict = sharing.get(key) ?? { color, panel, items: [] };
    conflict.items.push(item);
    sharing.set(key, conflict);
  }
  return [...sharing.values()].filter(conflict => conflict.items.length > 1);
}
