import { normalizeMaterialKey } from '../materials/materialKey';

import type { Protocol, ProtocolDye } from '@odysseus/shared-schemas';

export function keepDyeInFile(draft: Protocol, dye: ProtocolDye): void {
  const key = normalizeMaterialKey(dye.name);
  if (draft.dyes.some(kept => normalizeMaterialKey(kept.name) === key)) return;
  draft.dyes.push({ name: dye.name.trim(), lasers: [...dye.lasers], peak: dye.peak });
}
