import { normalizeMaterialKey } from '../materials/materialKey';

import { laserLabel, yourDye, type Dye, type DyeCatalog } from './dyeCatalog';

import type { ProtocolDye } from '@odysseus/shared-schemas';

export interface DyePick {
  name: string;
  group: string;
  peak?: number;
  isNew?: boolean;
}

const NON_DYE_CONJUGATES = ['HRP', 'Biotin', 'AP'];
const OTHER_CONJUGATES_GROUP = 'Other conjugates';
const NEW_DYE_GROUP = 'Not in the list';

const matchesTyped = (spellings: readonly string[], typedKey: string) =>
  !typedKey || spellings.some(spelling => normalizeMaterialKey(spelling).includes(typedKey));

const byLaserThenPeak = (a: Dye, b: Dye) => a.lasers[0] - b.lasers[0] || a.peak - b.peak;

export interface ResolvedDye {
  name: string;
  toKeep?: ProtocolDye;
}

export function resolveDye(
  catalog: DyeCatalog,
  remembered: readonly ProtocolDye[],
  typed: string
): ResolvedDye {
  const known = catalog.find(typed);
  if (known) return { name: known.name };
  const typedKey = normalizeMaterialKey(typed);
  const toKeep = typedKey
    ? remembered.find(dye => normalizeMaterialKey(dye.name) === typedKey)
    : undefined;
  return toKeep ? { name: toKeep.name, toKeep } : { name: typed.trim() };
}

export function conjugatePicks(
  catalog: DyeCatalog,
  remembered: readonly ProtocolDye[],
  typed: string,
  { includesOtherConjugates }: { includesOtherConjugates: boolean }
): DyePick[] {
  const typedKey = normalizeMaterialKey(typed);
  const rememberedDyes = remembered.filter(dye => !catalog.find(dye.name)).map(yourDye);
  const dyes = [...catalog.dyes, ...rememberedDyes]
    .filter(dye => dye.kind === 'conjugate' && matchesTyped([dye.name, ...dye.aliases], typedKey))
    .sort(byLaserThenPeak)
    .map(dye => ({ name: dye.name, group: laserLabel(dye.lasers[0]), peak: dye.peak }));
  const others = includesOtherConjugates
    ? NON_DYE_CONJUGATES.filter(name => matchesTyped([name], typedKey)).map(name => ({
        name,
        group: OTHER_CONJUGATES_GROUP,
      }))
    : [];
  const isKnown =
    !typedKey ||
    catalog.find(typed) !== undefined ||
    rememberedDyes.some(dye => normalizeMaterialKey(dye.name) === typedKey) ||
    NON_DYE_CONJUGATES.some(name => normalizeMaterialKey(name) === typedKey);
  const newDye = isKnown ? [] : [{ name: typed.trim(), group: NEW_DYE_GROUP, isNew: true }];
  return [...dyes, ...others, ...newDye];
}
