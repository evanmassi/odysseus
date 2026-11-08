import { wellDetails } from './wellContents';

import type { VesselSheet } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export interface MergedWells {
  row: number;
  col: number;
  width: number;
  height: number;
  keys: string[];
}

export interface ReplicateMerges {
  anchors: ReadonlyMap<string, MergedWells>;
  covered: ReadonlySet<string>;
}

const NO_MERGES: ReplicateMerges = { anchors: new Map(), covered: new Set() };

export function replicateMerges(
  block: VesselMapBlock,
  sheet: VesselSheet,
  calculation: BoardCalculation
): ReplicateMerges {
  if (!sheet.isPlate || !block.mergesReplicates) return NO_MERGES;
  const keyAt = new Map(sheet.spots.map(spot => [`${spot.row},${spot.col}`, spot.key]));
  const contents = new Map(
    sheet.spots.map(spot => [spot.key, wellDetails(block, spot.key, calculation).join('|')])
  );
  const anchors = new Map<string, MergedWells>();
  const covered = new Set<string>();
  const signatureAt = (row: number, col: number) => {
    const key = keyAt.get(`${row},${col}`);
    const text = key && !covered.has(key) ? contents.get(key) : undefined;
    return text ? text : undefined;
  };

  const grow = (row: number, col: number, signature: string, isAcrossFirst: boolean) => {
    let width = 1;
    let height = 1;
    const rowMatches = (atRow: number) =>
      Array.from({ length: width }, (_, i) => signatureAt(atRow, col + i)).every(
        s => s === signature
      );
    const colMatches = (atCol: number) =>
      Array.from({ length: height }, (_, i) => signatureAt(row + i, atCol)).every(
        s => s === signature
      );
    if (isAcrossFirst) {
      while (col + width < sheet.cols && signatureAt(row, col + width) === signature) width++;
      while (row + height < sheet.rows && rowMatches(row + height)) height++;
    } else {
      while (row + height < sheet.rows && signatureAt(row + height, col) === signature) height++;
      while (col + width < sheet.cols && colMatches(col + width)) width++;
    }
    return { width, height };
  };

  for (const spot of sheet.spots) {
    const signature = signatureAt(spot.row, spot.col);
    if (!signature) continue;
    const across = grow(spot.row, spot.col, signature, true);
    const down = grow(spot.row, spot.col, signature, false);
    const { width, height } =
      across.width * across.height >= down.width * down.height ? across : down;
    if (width * height === 1) continue;
    const keys = Array.from({ length: width * height }, (_, index) =>
      keyAt.get(`${spot.row + Math.floor(index / width)},${spot.col + (index % width)}`)
    ).filter((key): key is string => !!key);
    keys.forEach(key => covered.add(key));
    anchors.set(spot.key, { row: spot.row, col: spot.col, width, height, keys });
  }
  return { anchors, covered };
}

export function withMergedWells(merges: ReplicateMerges, keys: ReadonlySet<string>): Set<string> {
  const expanded = new Set(keys);
  for (const merged of merges.anchors.values()) {
    if (merged.keys.some(key => keys.has(key))) merged.keys.forEach(key => expanded.add(key));
  }
  return expanded;
}
