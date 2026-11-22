import { wellDetails } from './wellContents';
import { isWellFilled, shiftedTargets } from './wellSelection';

import type { PlateMapSheet, PlateMapPosition } from './plateMapTabs';
import type { SolvedBoard } from '../formulas/boardCalculation';
import type { PlateMapCard } from '@odysseus/shared-schemas';

export type StainSamples = ReadonlyMap<string, readonly string[]>;

export type StainMoveTargets = { landing: string[] } | { blockedBy: 'edge' | 'cells' };

interface Pool {
  positions: PlateMapPosition[];
  target: string;
}

export const stainPositionOf = (card: PlateMapCard, key: string) => card.stainedIn[key] ?? key;

export function stainSamples(card: PlateMapCard, sheet: PlateMapSheet): StainSamples {
  const samples = new Map(sheet.positions.map(position => [position.key, [] as string[]]));
  for (const position of sheet.positions) {
    if (isWellFilled(card, position.key))
      samples.get(stainPositionOf(card, position.key))?.push(position.key);
  }
  return samples;
}

export const isAtHome = (samples: StainSamples, key: string) => {
  const wells = samples.get(key) ?? [];
  return wells.length === 1 && wells[0] === key;
};

export function sharedByAll<Value>(
  wells: readonly string[],
  read: (well: string) => Value
): Value | undefined {
  const [first, ...rest] = wells.map(read);
  const shown = JSON.stringify(first);
  return rest.every(value => JSON.stringify(value) === shown) ? first : undefined;
}

export const isRearranged = (card: PlateMapCard, sheet: PlateMapSheet) =>
  sheet.positions.some(position => card.stainedIn[position.key] !== undefined);

const occupiedPositions = (
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>
) =>
  sheet.positions.filter(
    position => keys.has(position.key) && (samples.get(position.key)?.length ?? 0) > 0
  );

function regroup(card: PlateMapCard, samples: StainSamples, pools: readonly Pool[]): void {
  const stainIds = pools.map(pool =>
    pool.positions.map(position => card.stain[position.key]).find(Boolean)
  );
  for (const pool of pools) for (const position of pool.positions) delete card.stain[position.key];
  pools.forEach((pool, index) => {
    for (const well of pool.positions.flatMap(position => samples.get(position.key) ?? [])) {
      if (well === pool.target) delete card.stainedIn[well];
      else card.stainedIn[well] = pool.target;
    }
    const stainId = stainIds[index];
    if (stainId) card.stain[pool.target] = stainId;
    else delete card.stain[pool.target];
  });
}

export const canPoolSamples = (
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>
) => occupiedPositions(sheet, samples, keys).length > 1;

export function poolSamples(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>
): string[] {
  const samples = stainSamples(card, sheet);
  const positions = occupiedPositions(sheet, samples, keys);
  const first = sheet.positions.find(position => keys.has(position.key));
  if (positions.length < 2 || !first) return [];
  regroup(card, samples, [{ positions, target: first.key }]);
  return [first.key];
}

function replicateGroups(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>,
  board: SolvedBoard
): PlateMapPosition[][] {
  const groups = new Map<string, PlateMapPosition[]>();
  for (const position of occupiedPositions(sheet, samples, keys)) {
    const contents = (samples.get(position.key) ?? []).map(well =>
      wellDetails(card, well, board).join('|')
    );
    const signature = [...new Set(contents)].sort().join('\n');
    groups.set(signature, [...(groups.get(signature) ?? []), position]);
  }
  return [...groups.values()];
}

export const canPoolReplicates = (
  card: PlateMapCard,
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>,
  board: SolvedBoard
) => {
  const groups = replicateGroups(card, sheet, samples, keys, board);
  return groups.length > 1 && groups.some(group => group.length > 1);
};

export function poolReplicates(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  board: SolvedBoard
): string[] {
  const samples = stainSamples(card, sheet);
  const freeByRow = new Map<number, string[]>();
  for (const position of sheet.positions) {
    if (keys.has(position.key))
      freeByRow.set(position.row, [...(freeByRow.get(position.row) ?? []), position.key]);
  }
  const pools = replicateGroups(card, sheet, samples, keys, board).map(positions => ({
    positions,
    target: freeByRow.get(positions[0].row)?.shift() ?? positions[0].key,
  }));
  regroup(card, samples, pools);
  return pools.map(pool => pool.target);
}

const isPooled = (samples: StainSamples, key: string) => (samples.get(key)?.length ?? 0) > 1;

export const canUnpool = (samples: StainSamples, keys: ReadonlySet<string>) =>
  [...keys].some(key => isPooled(samples, key));

export function unpool(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>
): string[] {
  const samples = stainSamples(card, sheet);
  const dissolving = new Set([...keys].filter(key => isPooled(samples, key)));
  const queue = [...dissolving];
  while (queue.length) {
    for (const well of samples.get(queue.pop() ?? '') ?? []) {
      const isHomeTaken = (samples.get(well)?.length ?? 0) > 0;
      if (isHomeTaken && !dissolving.has(well)) {
        dissolving.add(well);
        queue.push(well);
      }
    }
  }
  const stainIds = new Map<string, string>();
  for (const position of dissolving) {
    const stainId = card.stain[position];
    for (const well of samples.get(position) ?? []) if (stainId) stainIds.set(well, stainId);
    delete card.stain[position];
  }
  const returned = [...dissolving].flatMap(position => samples.get(position) ?? []);
  for (const well of returned) delete card.stainedIn[well];
  for (const [well, stainId] of stainIds) card.stain[well] = stainId;
  return returned;
}

export function stainMoveTargets(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  keys: ReadonlySet<string>
): StainMoveTargets {
  const landing = shiftedTargets(sheet, cutKeys, keys);
  if (!landing) return { blockedBy: 'edge' };
  const samples = stainSamples(card, sheet);
  const isTaken = (key: string) => (samples.get(key)?.length ?? 0) > 0 && !cutKeys.has(key);
  return landing.some(isTaken) ? { blockedBy: 'cells' } : { landing };
}

export function moveStainPositions(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const samples = stainSamples(card, sheet);
  const leaving = sheet.positions.filter(position => cutKeys.has(position.key));
  const stainIds = leaving.map(position => card.stain[position.key]);
  for (const key of [...cutKeys, ...landing]) delete card.stain[key];
  leaving.forEach((position, index) => {
    const target = landing[index];
    for (const well of samples.get(position.key) ?? []) {
      if (well === target) delete card.stainedIn[well];
      else card.stainedIn[well] = target;
    }
    const stainId = stainIds[index];
    if (stainId) card.stain[target] = stainId;
  });
}

export function forgetStainOf(card: PlateMapCard, keys: ReadonlySet<string>): void {
  for (const key of keys) {
    const position = stainPositionOf(card, key);
    const isStillUsed = Object.keys(card.cells).some(
      other =>
        !keys.has(other) && isWellFilled(card, other) && stainPositionOf(card, other) === position
    );
    if (!isStillUsed) delete card.stain[position];
    delete card.stainedIn[key];
  }
}
