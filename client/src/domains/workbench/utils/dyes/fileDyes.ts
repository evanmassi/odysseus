import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { CONJUGATE_FIELD } from '../materials/materialClashes';

import type { MaterialItem, Protocol, ProtocolDye } from '@odysseus/shared-schemas';

export function keepDyeInFile(draft: Protocol, dye: ProtocolDye): void {
  const key = normalizeMaterialKey(dye.name);
  if (draft.dyes.some(kept => normalizeMaterialKey(kept.name) === key)) return;
  draft.dyes.push({ name: dye.name.trim(), lasers: [...dye.lasers], peak: dye.peak });
}

export function keepDyesUsedBy(
  draft: Protocol,
  items: readonly MaterialItem[],
  known: readonly ProtocolDye[]
): void {
  for (const item of items) {
    const key = normalizeMaterialKey(item.values[CONJUGATE_FIELD] ?? '');
    const dye = key
      ? known.find(candidate => normalizeMaterialKey(candidate.name) === key)
      : undefined;
    if (dye) keepDyeInFile(draft, dye);
  }
}
