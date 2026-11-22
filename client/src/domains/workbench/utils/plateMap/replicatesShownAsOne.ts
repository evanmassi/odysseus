import { isAtHome, type StainSamples } from './stainLayout';
import { wellDetails } from './wellContents';

import type { PlateMapSheet } from './plateMapTabs';
import type { SolvedBoard } from '../formulas/boardCalculation';
import type { PlateMapCard } from '@odysseus/shared-schemas';

export interface ReplicateGroup {
  row: number;
  col: number;
  width: number;
  height: number;
  keys: string[];
}

export interface ReplicatesShownAsOne {
  anchors: ReadonlyMap<string, ReplicateGroup>;
  covered: ReadonlySet<string>;
}

const NONE_SHOWN_AS_ONE: ReplicatesShownAsOne = { anchors: new Map(), covered: new Set() };

export function replicatesShownAsOne(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  board: SolvedBoard,
  stainSamples: StainSamples | undefined
): ReplicatesShownAsOne {
  if (!sheet.isPlate || !card.mergesReplicates) return NONE_SHOWN_AS_ONE;
  const keyAt = new Map(
    sheet.positions.map(position => [`${position.row},${position.col}`, position.key])
  );
  const contents = new Map(
    sheet.positions.map(position => {
      const details = wellDetails(card, position.key, board).join('|');
      if (!stainSamples) return [position.key, details];
      if (!isAtHome(stainSamples, position.key)) return [position.key, ''];
      const stainId = card.stain[position.key];
      return [
        position.key,
        details && stainId !== undefined ? `${details}|stain:${stainId}` : details,
      ];
    })
  );
  const anchors = new Map<string, ReplicateGroup>();
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

  for (const position of sheet.positions) {
    const signature = signatureAt(position.row, position.col);
    if (!signature) continue;
    const across = grow(position.row, position.col, signature, true);
    const down = grow(position.row, position.col, signature, false);
    const { width, height } =
      across.width * across.height >= down.width * down.height ? across : down;
    if (width * height === 1) continue;
    const keys = Array.from({ length: width * height }, (_, index) =>
      keyAt.get(`${position.row + Math.floor(index / width)},${position.col + (index % width)}`)
    ).filter((key): key is string => !!key);
    keys.forEach(key => covered.add(key));
    anchors.set(position.key, { row: position.row, col: position.col, width, height, keys });
  }
  return { anchors, covered };
}
