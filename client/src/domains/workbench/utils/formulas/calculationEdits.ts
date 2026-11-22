import { CARD_TYPES } from '../cards/cardTypes';
import { createCard } from '../cards/createCard';
import { createId } from '../ids/createId';

import { nameWithin } from './formulaScopes';
import { AUTO_UNIT } from './quantities';

import type {
  CalculationsCard,
  MaterialItem,
  Protocol,
  ValuesCard,
} from '@odysseus/shared-schemas';

type CalculationItem = CalculationsCard['items'][number];

function calculationsCard(draft: Protocol, cardId: string): CalculationsCard | undefined {
  const card = draft.blocks.find(candidate => candidate.id === cardId);
  return card?.type === 'formula' ? card : undefined;
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

export function addNamedValue(
  draft: Protocol,
  name: string,
  material: MaterialItem | undefined,
  pageId: string
): void {
  let values = draft.blocks.find((card): card is ValuesCard => card.type === 'values');
  if (!values) {
    const [w, h] = CARD_TYPES.values.size;
    const bottom = Math.max(
      0,
      ...draft.blocks.filter(card => card.page === pageId).map(card => card.y + card.h)
    );
    values = createCard('values', { page: pageId, x: 0, y: bottom, w, h }) as ValuesCard;
    draft.blocks.push(values);
  }
  let valueRow =
    material &&
    values.sections.find(
      candidate => 'materialId' in candidate && candidate.materialId === material.id
    );
  if (material && !valueRow) {
    valueRow = { id: createId(), materialId: material.id };
    values.sections.push(valueRow);
  }
  const item = {
    id: createId(),
    name: nameWithin(name, material),
    value: '',
    unit: '',
    ...(valueRow && { section: valueRow.id }),
  };
  const peers = values.items.filter(
    candidate => (candidate.section ?? '') === (valueRow?.id ?? '')
  );
  const last = peers.at(-1);
  values.items.splice(last ? values.items.indexOf(last) + 1 : values.items.length, 0, item);
}
