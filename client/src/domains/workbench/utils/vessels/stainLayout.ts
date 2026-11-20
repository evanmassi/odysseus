import { wellDetails } from './wellContents';
import { isWellFilled, shiftedTargets } from './wellSelection';

import type { VesselSheet, VesselSpot } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export type StainOccupants = ReadonlyMap<string, readonly string[]>;

export type StainMoveTargets = { landing: string[] } | { blockedBy: 'edge' | 'cells' };

interface Pool {
  spots: VesselSpot[];
  target: string;
}

export const stainSpotOf = (block: VesselMapBlock, key: string) => block.stainedIn[key] ?? key;

export function stainOccupants(block: VesselMapBlock, sheet: VesselSheet): StainOccupants {
  const occupants = new Map(sheet.spots.map(spot => [spot.key, [] as string[]]));
  for (const spot of sheet.spots) {
    if (isWellFilled(block, spot.key)) occupants.get(stainSpotOf(block, spot.key))?.push(spot.key);
  }
  return occupants;
}

export const isAtHome = (occupants: StainOccupants, key: string) => {
  const wells = occupants.get(key) ?? [];
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

export const isRearranged = (block: VesselMapBlock, sheet: VesselSheet) =>
  sheet.spots.some(spot => block.stainedIn[spot.key] !== undefined);

const occupiedSpots = (sheet: VesselSheet, occupants: StainOccupants, keys: ReadonlySet<string>) =>
  sheet.spots.filter(spot => keys.has(spot.key) && (occupants.get(spot.key)?.length ?? 0) > 0);

function regroup(block: VesselMapBlock, occupants: StainOccupants, pools: readonly Pool[]): void {
  const mixes = pools.map(pool => pool.spots.map(spot => block.stain[spot.key]).find(Boolean));
  for (const pool of pools) for (const spot of pool.spots) delete block.stain[spot.key];
  pools.forEach((pool, index) => {
    for (const well of pool.spots.flatMap(spot => occupants.get(spot.key) ?? [])) {
      if (well === pool.target) delete block.stainedIn[well];
      else block.stainedIn[well] = pool.target;
    }
    const mix = mixes[index];
    if (mix) block.stain[pool.target] = mix;
    else delete block.stain[pool.target];
  });
}

export const canPoolSamples = (
  sheet: VesselSheet,
  occupants: StainOccupants,
  keys: ReadonlySet<string>
) => occupiedSpots(sheet, occupants, keys).length > 1;

export function poolSamples(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>
): string[] {
  const occupants = stainOccupants(block, sheet);
  const spots = occupiedSpots(sheet, occupants, keys);
  const first = sheet.spots.find(spot => keys.has(spot.key));
  if (spots.length < 2 || !first) return [];
  regroup(block, occupants, [{ spots, target: first.key }]);
  return [first.key];
}

function replicateGroups(
  block: VesselMapBlock,
  sheet: VesselSheet,
  occupants: StainOccupants,
  keys: ReadonlySet<string>,
  calculation: BoardCalculation
): VesselSpot[][] {
  const groups = new Map<string, VesselSpot[]>();
  for (const spot of occupiedSpots(sheet, occupants, keys)) {
    const contents = (occupants.get(spot.key) ?? []).map(well =>
      wellDetails(block, well, calculation).join('|')
    );
    const signature = [...new Set(contents)].sort().join('\n');
    groups.set(signature, [...(groups.get(signature) ?? []), spot]);
  }
  return [...groups.values()];
}

export const canPoolReplicates = (
  block: VesselMapBlock,
  sheet: VesselSheet,
  occupants: StainOccupants,
  keys: ReadonlySet<string>,
  calculation: BoardCalculation
) => {
  const groups = replicateGroups(block, sheet, occupants, keys, calculation);
  return groups.length > 1 && groups.some(group => group.length > 1);
};

export function poolReplicates(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>,
  calculation: BoardCalculation
): string[] {
  const occupants = stainOccupants(block, sheet);
  const freeByRow = new Map<number, string[]>();
  for (const spot of sheet.spots) {
    if (keys.has(spot.key)) freeByRow.set(spot.row, [...(freeByRow.get(spot.row) ?? []), spot.key]);
  }
  const pools = replicateGroups(block, sheet, occupants, keys, calculation).map(spots => ({
    spots,
    target: freeByRow.get(spots[0].row)?.shift() ?? spots[0].key,
  }));
  regroup(block, occupants, pools);
  return pools.map(pool => pool.target);
}

const isPooled = (occupants: StainOccupants, key: string) => (occupants.get(key)?.length ?? 0) > 1;

export const canUnpool = (occupants: StainOccupants, keys: ReadonlySet<string>) =>
  [...keys].some(key => isPooled(occupants, key));

export function unpool(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>
): string[] {
  const occupants = stainOccupants(block, sheet);
  const dissolving = new Set([...keys].filter(key => isPooled(occupants, key)));
  const queue = [...dissolving];
  while (queue.length) {
    for (const well of occupants.get(queue.pop() ?? '') ?? []) {
      const isHomeTaken = (occupants.get(well)?.length ?? 0) > 0;
      if (isHomeTaken && !dissolving.has(well)) {
        dissolving.add(well);
        queue.push(well);
      }
    }
  }
  const mixes = new Map<string, string>();
  for (const spot of dissolving) {
    const mix = block.stain[spot];
    for (const well of occupants.get(spot) ?? []) if (mix) mixes.set(well, mix);
    delete block.stain[spot];
  }
  const returned = [...dissolving].flatMap(spot => occupants.get(spot) ?? []);
  for (const well of returned) delete block.stainedIn[well];
  for (const [well, mix] of mixes) block.stain[well] = mix;
  return returned;
}

export function stainMoveTargets(
  block: VesselMapBlock,
  sheet: VesselSheet,
  cutKeys: ReadonlySet<string>,
  keys: ReadonlySet<string>
): StainMoveTargets {
  const landing = shiftedTargets(sheet, cutKeys, keys);
  if (!landing) return { blockedBy: 'edge' };
  const occupants = stainOccupants(block, sheet);
  const isTaken = (key: string) => (occupants.get(key)?.length ?? 0) > 0 && !cutKeys.has(key);
  return landing.some(isTaken) ? { blockedBy: 'cells' } : { landing };
}

export function moveStainSpots(
  block: VesselMapBlock,
  sheet: VesselSheet,
  cutKeys: ReadonlySet<string>,
  landing: readonly string[]
): void {
  const occupants = stainOccupants(block, sheet);
  const leaving = sheet.spots.filter(spot => cutKeys.has(spot.key));
  const mixes = leaving.map(spot => block.stain[spot.key]);
  for (const key of [...cutKeys, ...landing]) delete block.stain[key];
  leaving.forEach((spot, index) => {
    const target = landing[index];
    for (const well of occupants.get(spot.key) ?? []) {
      if (well === target) delete block.stainedIn[well];
      else block.stainedIn[well] = target;
    }
    const mix = mixes[index];
    if (mix) block.stain[target] = mix;
  });
}

export function forgetStainOf(block: VesselMapBlock, keys: ReadonlySet<string>): void {
  for (const key of keys) {
    const spot = stainSpotOf(block, key);
    const isStillUsed = Object.keys(block.cells).some(
      other => !keys.has(other) && isWellFilled(block, other) && stainSpotOf(block, other) === spot
    );
    if (!isStillUsed) delete block.stain[spot];
    delete block.stainedIn[key];
  }
}
