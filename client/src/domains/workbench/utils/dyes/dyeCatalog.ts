import { normalizeMaterialKey } from '../materials/materialKey';

import { BUILT_IN_DYE_GROUPS, type DyeKind } from './dyeList';

import type { ProtocolDye } from '@odysseus/shared-schemas';

export interface Dye {
  name: string;
  aliases: readonly string[];
  lasers: readonly number[];
  peak: number;
  kind: DyeKind;
  isFixable: boolean;
  isYours: boolean;
}

export interface DyeCatalog {
  dyes: readonly Dye[];
  find: (spelling: string) => Dye | undefined;
}

const LASER_COLOR_NAMES: Readonly<Record<number, string>> = {
  355: 'UV',
  405: 'Violet',
  488: 'Blue',
  561: 'Yellow-green',
  640: 'Red',
  808: 'Near-IR',
};

export const STANDARD_LASERS_NM: readonly number[] = Object.keys(LASER_COLOR_NAMES).map(Number);

export const laserLabel = (nm: number): string =>
  LASER_COLOR_NAMES[nm] ? `${LASER_COLOR_NAMES[nm]} ${nm}` : `${nm} nm`;

export const dyeLaserLabel = (dye: Dye): string => dye.lasers.map(laserLabel).join(' or ');

const BUILT_IN_DYES: readonly Dye[] = BUILT_IN_DYE_GROUPS.flatMap(
  ({ kind, lasers, isFixable = false, dyes }) =>
    dyes.map(([name, peak, ...aliases]) => ({
      name,
      aliases,
      lasers,
      peak,
      kind,
      isFixable,
      isYours: false,
    }))
);

export const yourDye = ({ name, lasers, peak }: ProtocolDye): Dye => ({
  name,
  aliases: [],
  lasers,
  peak,
  kind: 'conjugate',
  isFixable: false,
  isYours: true,
});

function catalogOf(dyes: readonly Dye[]): DyeCatalog {
  const byKey = new Map<string, Dye>();
  for (const dye of dyes) {
    for (const spelling of [dye.name, ...dye.aliases]) {
      const key = normalizeMaterialKey(spelling);
      if (key && !byKey.has(key)) byKey.set(key, dye);
    }
  }
  return { dyes, find: spelling => byKey.get(normalizeMaterialKey(spelling)) };
}

export const BUILT_IN_CATALOG: DyeCatalog = catalogOf(BUILT_IN_DYES);

const catalogsByFileDyes = new WeakMap<readonly ProtocolDye[], DyeCatalog>();

export function dyeCatalog(fileDyes: readonly ProtocolDye[]): DyeCatalog {
  if (fileDyes.length === 0) return BUILT_IN_CATALOG;
  const cached = catalogsByFileDyes.get(fileDyes);
  if (cached) return cached;
  const catalog = catalogOf([...BUILT_IN_DYES, ...fileDyes.map(yourDye)]);
  catalogsByFileDyes.set(fileDyes, catalog);
  return catalog;
}

export const dyeSpelling = (catalog: DyeCatalog, typed: string): string =>
  catalog.find(typed)?.name ?? typed.trim();
