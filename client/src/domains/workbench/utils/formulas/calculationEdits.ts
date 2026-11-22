import { createId } from '../ids/createId';

import { AUTO_UNIT } from './quantities';

import type { CalculationsCard, Protocol } from '@odysseus/shared-schemas';

type CalculationItem = CalculationsCard['items'][number];

function calculationsCard(draft: Protocol, cardId: string): CalculationsCard | undefined {
  const card = draft.cards.find(candidate => candidate.id === cardId);
  return card?.type === 'calculations' ? card : undefined;
}

export function insertCalculation(
  draft: Protocol,
  cardId: string,
  calculation: Omit<CalculationItem, 'id' | 'unit'>,
  sectionOf: (item: CalculationItem) => string | undefined,
  section: string | undefined
): string | undefined {
  const card = calculationsCard(draft, cardId);
  if (!card) return undefined;
  const id = createId();
  const last = card.items.reduce(
    (found, item, index) => (sectionOf(item) === section ? index : found),
    -1
  );
  card.items.splice(last < 0 ? card.items.length : last + 1, 0, {
    id,
    ...calculation,
    unit: AUTO_UNIT,
  });
  return id;
}

export function updateCalculation(
  draft: Protocol,
  cardId: string,
  itemId: string,
  change: Partial<Omit<CalculationItem, 'id'>>
) {
  const item = calculationsCard(draft, cardId)?.items.find(candidate => candidate.id === itemId);
  if (item) Object.assign(item, change);
}

export function removeCalculation(draft: Protocol, cardId: string, itemId: string): void {
  const card = calculationsCard(draft, cardId);
  if (card) card.items = card.items.filter(item => item.id !== itemId);
}

export function setCalculationSection(
  draft: Protocol,
  cardId: string,
  materialId: string,
  isShown: boolean
): void {
  const card = calculationsCard(draft, cardId);
  if (!card) return;
  card.materialSections = isShown
    ? [...new Set([...card.materialSections, materialId])]
    : card.materialSections.filter(id => id !== materialId);
}
