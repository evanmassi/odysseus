import {
  guessMaterial,
  splitPastedMaterials,
  type RememberedMaterialKind,
} from './materialGuesser';
import { findDuplicateMaterial, materialFromGuess, mergeMaterialInto } from './materialItems';
import { normalizeMaterialKey } from './materialKey';

import type { LabMemory } from './materialMemory';
import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

export interface MaterialReviewRow {
  item: MaterialItem;
  why: string;
  duplicateId?: string;
  isKeptBoth: boolean;
  isCorrected: boolean;
}

export const reviewRow = (
  items: readonly MaterialItem[],
  keptBoth: readonly string[],
  item: MaterialItem,
  why: string
): MaterialReviewRow => ({
  item,
  why,
  duplicateId: findDuplicateMaterial(items, item, keptBoth)?.id,
  isKeptBoth: false,
  isCorrected: false,
});

export const hasMultipleLines = (text: string): boolean => /\n/.test(text.trim());

export function pastedReviewRows(
  text: string,
  items: readonly MaterialItem[],
  keptBoth: readonly string[],
  remembered: ReadonlyMap<string, RememberedMaterialKind>,
  memory: LabMemory
): MaterialReviewRow[] {
  return splitPastedMaterials(text).map(row => {
    const guess = guessMaterial(row.text, remembered, row.context);
    return reviewRow(items, keptBoth, materialFromGuess(guess, memory), guess.why);
  });
}

export const materialCount = (count: number): string =>
  `${count} material${count === 1 ? '' : 's'}`;

export function reviewActionLabel(rows: readonly MaterialReviewRow[]): string {
  const added = rows.filter(row => !row.duplicateId || row.isKeptBoth).length;
  const merged = rows.length - added;
  const action = [added ? `Add ${materialCount(added)}` : '', merged ? `merge ${merged}` : '']
    .filter(Boolean)
    .join(', ');
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}

export function commitReviewRows(
  protocol: Protocol,
  blockId: string,
  rows: readonly MaterialReviewRow[]
): string[] {
  const block = protocol.blocks.find(candidate => candidate.id === blockId);
  if (block?.type !== 'materials') return [];
  const freshIds = new Set<string>();
  for (const { item, duplicateId, isKeptBoth } of rows) {
    const duplicate = block.items.find(candidate => candidate.id === duplicateId);
    if (duplicate && !isKeptBoth) {
      mergeMaterialInto(duplicate, item);
      freshIds.add(duplicate.id);
      continue;
    }
    if (duplicate) protocol.keptBoth.push(normalizeMaterialKey(item.name));
    block.items.push(item);
    freshIds.add(item.id);
    block.foldedGroups = block.foldedGroups.filter(group => group !== item.group);
  }
  return [...freshIds];
}
