import { wellDetails } from './wellContents';
import { isWellFilled, shiftedTargets } from './wellSelection';

import type { PlateMapSheet, PlateMapPosition } from './plateMapTabs';
import type { SolvedBoard } from '../formulas/boardCalculation';
import type { PlateMapBlock } from '@odysseus/shared-schemas';

export type StainSamples = ReadonlyMap<string, readonly string[]>;

export type StainMoveTargets = { landing: string[] } | { blockedBy: 'edge' | 'cells' };

interface Pool {
  positions: PlateMapPosition[];
  target: string;
}

export const stainPositionOf = (block: PlateMapBlock, key: string) => block.stainedIn[key] ?? key;

export function stainSamples(block: PlateMapBlock, sheet: PlateMapSheet): StainSamples {
  const samples = new Map(sheet.positions.map(position => [position.key, [] as string[]]));
  for (const position of sheet.positions) {
    if (isWellFilled(block, position.key))
      samples.get(stainPositionOf(block, position.key))?.push(position.key);
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

export const isRearranged = (block: PlateMapBlock, sheet: PlateMapSheet) =>
  sheet.positions.some(position => block.stainedIn[position.key] !== undefined);

const occupiedPositions = (
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>
) =>
  sheet.positions.filter(
    position => keys.has(position.key) && (samples.get(position.key)?.length ?? 0) > 0
  );

function regroup(block: PlateMapBlock, samples: StainSamples, pools: readonly Pool[]): void {
  const stainIds = pools.map(pool =>
    pool.positions.map(position => block.stain[position.key]).find(Boolean)
  );
  for (const pool of pools) for (const position of pool.positions) delete block.stain[position.key];
  pools.forEach((pool, index) => {
    for (const well of pool.positions.flatMap(position => samples.get(position.key) ?? [])) {
      if (well === pool.target) delete block.stainedIn[well];
      else block.stainedIn[well] = pool.target;
    }
    const stainId = stainIds[index];
    if (stainId) block.stain[pool.target] = stainId;
    else delete block.stain[pool.target];
  });
}

export const canPoolSamples = (
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>
) => occupiedPositions(sheet, samples, keys).length > 1;

export function poolSamples(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>
): string[] {
  const samples = stainSamples(block, sheet);
  const positions = occupiedPositions(sheet, samples, keys);
  const first = sheet.positions.find(position => keys.has(position.key));
  if (positions.length < 2 || !first) return [];
  regroup(block, samples, [{ positions, target: first.key }]);
  return [first.key];
}

function replicateGroups(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>,
  board: SolvedBoard
): PlateMapPosition[][] {
  const groups = new Map<string, PlateMapPosition[]>();
  for (const position of occupiedPositions(sheet, samples, keys)) {
    const contents = (samples.get(position.key) ?? []).map(well =>
      wellDetails(block, well, board).join('|')
    );
    const signature = [...new Set(contents)].sort().join('\n');
    groups.set(signature, [...(groups.get(signature) ?? []), position]);
  }
  return [...groups.values()];
}

export const canPoolReplicates = (
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  samples: StainSamples,
  keys: ReadonlySet<string>,
  board: SolvedBoard
) => {
  const groups = replicateGroups(block, sheet, samples, keys, board);
  return groups.length > 1 && groups.some(group => group.length > 1);
};

export function poolReplicates(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  board: SolvedBoard
): string[] {
  const samples = stainSamples(block, sheet);
  const freeByRow = new Map<number, string[]>();
  for (const position of sheet.positions) {
    if (keys.has(position.key))
      freeByRow.set(position.row, [...(freeByRow.get(position.row) ?? []), position.key]);
  }
  const pools = replicateGroups(block, sheet, samples, keys, board).map(positions => ({
    positions,
    target: freeByRow.get(positions[0].row)?.shift() ?? positions[0].key,
  }));
  regroup(block, samples, pools);
  return pools.map(pool => pool.target);
}

const isPooled = (samples: StainSamples, key: string) => (samples.get(key)?.length ?? 0) > 1;

export const canUnpool = (samples: StainSamples, keys: ReadonlySet<string>) =>
  [...keys].some(key => isPooled(samples, key));

export function unpool(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>
): string[] {
  const samples = stainSamples(block, sheet);
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
    const stainId = block.stain[position];
    for (const well of samples.get(position) ?? []) if (stainId) stainIds.set(well, stainId);
    delete block.stain[position];
  }
  const returned = [...dissolving].flatMap(position => samples.get(position) ?? []);
  for (const well of returned) delete block.stainedIn[well];
  for (const [well, stainId] of stainIds) block.stain[well] = stainId;
  return returned;
}

export function stainMoveTargets(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  keys: ReadonlySet<string>
): StainMoveTargets {
  const landing = shiftedTargets(sheet, cutKeys, keys);
  if (!landing) return { blockedBy: 'edge' };
  const samples = stainSamples(block, sheet);
  const isTaken = (key: string) => (samples.get(key)?.length ?? 0) > 0 && !cutKeys.has(key);
  return landing.some(isTaken) ? { blockedBy: 'cells' } : { landing };
}

export function moveStainPositions(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const samples = stainSamples(block, sheet);
  const leaving = sheet.positions.filter(position => cutKeys.has(position.key));
  const stainIds = leaving.map(position => block.stain[position.key]);
  for (const key of [...cutKeys, ...landing]) delete block.stain[key];
  leaving.forEach((position, index) => {
    const target = landing[index];
    for (const well of samples.get(position.key) ?? []) {
      if (well === target) delete block.stainedIn[well];
      else block.stainedIn[well] = target;
    }
    const stainId = stainIds[index];
    if (stainId) block.stain[target] = stainId;
  });
}

export function forgetStainOf(block: PlateMapBlock, keys: ReadonlySet<string>): void {
  for (const key of keys) {
    const position = stainPositionOf(block, key);
    const isStillUsed = Object.keys(block.cells).some(
      other =>
        !keys.has(other) && isWellFilled(block, other) && stainPositionOf(block, other) === position
    );
    if (!isStillUsed) delete block.stain[position];
    delete block.stainedIn[key];
  }
}
