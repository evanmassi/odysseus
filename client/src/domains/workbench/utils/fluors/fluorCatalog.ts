import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { BUILT_IN_FLUOR_GROUPS, type FluorKind } from './fluorList';

import type { ProtocolFluor } from '@odysseus/shared-schemas';

export interface Fluor {
  name: string;
  aliases: readonly string[];
  lasers: readonly number[];
  peak: number;
  kind: FluorKind;
  isFixable: boolean;
  isYours: boolean;
}

export interface FluorCatalog {
  fluors: readonly Fluor[];
  find: (spelling: string) => Fluor | undefined;
}

const LASER_COLOR_NAMES: Readonly<Record<number, string>> = {
  355: 'UV',
  405: 'Violet',
  488: 'Blue',
  532: 'Green',
  561: 'Yellow-green',
  640: 'Red',
  808: 'Near-IR',
};

export const STANDARD_LASERS_NM: readonly number[] = Object.keys(LASER_COLOR_NAMES).map(Number);

export const laserLabel = (nm: number): string =>
  LASER_COLOR_NAMES[nm] ? `${LASER_COLOR_NAMES[nm]} ${nm}` : `${nm} nm`;

const BUILT_IN_FLUORS: readonly Fluor[] = BUILT_IN_FLUOR_GROUPS.flatMap(
  ({ kind, lasers, isFixable = false, fluors: fluors }) =>
    fluors.map(([name, peak, ...aliases]) => ({
      name,
      aliases,
      lasers,
      peak,
      kind,
      isFixable,
      isYours: false,
    }))
);

export const yourFluor = ({ name, lasers, peak }: ProtocolFluor): Fluor => ({
  name,
  aliases: [],
  lasers,
  peak,
  kind: 'conjugate',
  isFixable: false,
  isYours: true,
});

function catalogOf(fluors: readonly Fluor[]): FluorCatalog {
  const byKey = new Map<string, Fluor>();
  for (const fluor of fluors) {
    for (const spelling of [fluor.name, ...fluor.aliases]) {
      const key = normalizeMaterialKey(spelling);
      if (key && !byKey.has(key)) byKey.set(key, fluor);
    }
  }
  return { fluors: fluors, find: spelling => byKey.get(normalizeMaterialKey(spelling)) };
}

export const BUILT_IN_CATALOG: FluorCatalog = catalogOf(BUILT_IN_FLUORS);

const catalogsByFileFluors = new WeakMap<readonly ProtocolFluor[], FluorCatalog>();

export function fluorCatalog(fileFluors: readonly ProtocolFluor[]): FluorCatalog {
  if (fileFluors.length === 0) return BUILT_IN_CATALOG;
  const cached = catalogsByFileFluors.get(fileFluors);
  if (cached) return cached;
  const catalog = catalogOf([...BUILT_IN_FLUORS, ...fileFluors.map(yourFluor)]);
  catalogsByFileFluors.set(fileFluors, catalog);
  return catalog;
}

export const fluorSpelling = (catalog: FluorCatalog, typed: string): string =>
  catalog.find(typed)?.name ?? typed.trim();
