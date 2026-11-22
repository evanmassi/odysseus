import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { guessMaterial, splitPastedMaterials, type MaterialKnowledge } from './materialGuesser';
import { findAlreadyListed, materialFromGuess, mergeMaterialInto } from './materialItems';

import type { LabMemory } from './materialMemory';
import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

export interface MaterialReviewRow {
  item: MaterialItem;
  why: string;
  alreadyListedId?: string;
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
  alreadyListedId: findAlreadyListed(items, item, keptBoth)?.id,
  isKeptBoth: false,
  isCorrected: false,
});

export const hasMultipleLines = (text: string): boolean => /\n/.test(text.trim());

export function pastedReviewRows(
  text: string,
  items: readonly MaterialItem[],
  keptBoth: readonly string[],
  known: MaterialKnowledge,
  memory: LabMemory
): MaterialReviewRow[] {
  return splitPastedMaterials(text).map(row => {
    const guess = guessMaterial(row.text, known, row.context);
    return reviewRow(items, keptBoth, materialFromGuess(guess, memory), guess.why);
  });
}

export const materialCount = (count: number): string =>
  `${count} material${count === 1 ? '' : 's'}`;

export function reviewActionLabel(rows: readonly MaterialReviewRow[]): string {
  const added = rows.filter(row => !row.alreadyListedId || row.isKeptBoth).length;
  const merged = rows.length - added;
  const action = [added ? `Add ${materialCount(added)}` : '', merged ? `merge ${merged}` : '']
    .filter(Boolean)
    .join(', ');
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}

export function commitReviewRows(
  protocol: Protocol,
  cardId: string,
  rows: readonly MaterialReviewRow[]
): string[] {
  const card = protocol.blocks.find(candidate => candidate.id === cardId);
  if (card?.type !== 'materials') return [];
  const freshIds = new Set<string>();
  for (const { item, alreadyListedId, isKeptBoth } of rows) {
    const alreadyListed = card.items.find(candidate => candidate.id === alreadyListedId);
    if (alreadyListed && !isKeptBoth) {
      mergeMaterialInto(alreadyListed, item);
      freshIds.add(alreadyListed.id);
      continue;
    }
    if (alreadyListed) protocol.keptBoth.push(normalizeMaterialKey(item.name));
    card.items.push(item);
    freshIds.add(item.id);
    card.foldedGroups = card.foldedGroups.filter(group => group !== item.group);
  }
  return [...freshIds];
}
