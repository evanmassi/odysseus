import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { laserLabel, yourFluor, type Fluor, type FluorCatalog } from './fluorCatalog';

import type { ProtocolFluor } from '@odysseus/shared-schemas';

export interface FluorPick {
  name: string;
  group: string;
  peak?: number;
  isNew?: boolean;
}

const NON_FLUOR_CONJUGATES = ['HRP', 'Biotin', 'AP', 'Digoxigenin'];
const OTHER_CONJUGATES_GROUP = 'Other conjugates';
const NEW_FLUOR_GROUP = 'Not in the list';

const matchesTyped = (spellings: readonly string[], typedKey: string) =>
  !typedKey || spellings.some(spelling => normalizeMaterialKey(spelling).includes(typedKey));

const byLaserThenPeak = (a: Fluor, b: Fluor) => a.lasers[0] - b.lasers[0] || a.peak - b.peak;

export interface ResolvedFluor {
  name: string;
  toKeep?: ProtocolFluor;
}

export function resolveFluor(
  catalog: FluorCatalog,
  remembered: readonly ProtocolFluor[],
  typed: string
): ResolvedFluor {
  const known = catalog.find(typed);
  if (known) return { name: known.name };
  const typedKey = normalizeMaterialKey(typed);
  const toKeep = typedKey
    ? remembered.find(fluor => normalizeMaterialKey(fluor.name) === typedKey)
    : undefined;
  return toKeep ? { name: toKeep.name, toKeep } : { name: typed.trim() };
}

export function conjugatePicks(
  catalog: FluorCatalog,
  remembered: readonly ProtocolFluor[],
  typed: string,
  { includesOtherConjugates }: { includesOtherConjugates: boolean }
): FluorPick[] {
  const typedKey = normalizeMaterialKey(typed);
  const rememberedFluors = remembered.filter(fluor => !catalog.find(fluor.name)).map(yourFluor);
  const fluors = [...catalog.fluors, ...rememberedFluors]
    .filter(
      fluor => fluor.kind === 'conjugate' && matchesTyped([fluor.name, ...fluor.aliases], typedKey)
    )
    .sort(byLaserThenPeak)
    .map(fluor => ({ name: fluor.name, group: laserLabel(fluor.lasers[0]), peak: fluor.peak }));
  const others = includesOtherConjugates
    ? NON_FLUOR_CONJUGATES.filter(name => matchesTyped([name], typedKey)).map(name => ({
        name,
        group: OTHER_CONJUGATES_GROUP,
      }))
    : [];
  const isKnown =
    !typedKey ||
    catalog.find(typed) !== undefined ||
    rememberedFluors.some(fluor => normalizeMaterialKey(fluor.name) === typedKey) ||
    NON_FLUOR_CONJUGATES.some(name => normalizeMaterialKey(name) === typedKey);
  const newFluor = isKnown ? [] : [{ name: typed.trim(), group: NEW_FLUOR_GROUP, isNew: true }];
  return [...fluors, ...others, ...newFluor];
}
