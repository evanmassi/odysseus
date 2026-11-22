import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { CONJUGATE_FIELD } from '../materials/conjugateConflicts';

import type { MaterialItem, Protocol, ProtocolFluor } from '@odysseus/shared-schemas';

export function keepFluorInFile(draft: Protocol, fluor: ProtocolFluor): void {
  const key = normalizeMaterialKey(fluor.name);
  if (draft.dyes.some(kept => normalizeMaterialKey(kept.name) === key)) return;
  draft.dyes.push({ name: fluor.name.trim(), lasers: [...fluor.lasers], peak: fluor.peak });
}

export function keepFluorsUsedBy(
  draft: Protocol,
  items: readonly MaterialItem[],
  known: readonly ProtocolFluor[]
): void {
  for (const item of items) {
    const key = normalizeMaterialKey(item.values[CONJUGATE_FIELD] ?? '');
    const fluor = key
      ? known.find(candidate => normalizeMaterialKey(candidate.name) === key)
      : undefined;
    if (fluor) keepFluorInFile(draft, fluor);
  }
}
