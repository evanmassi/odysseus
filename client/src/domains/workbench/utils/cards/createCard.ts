import { createId } from '../ids/createId';

import { CARD_TYPES, defaultCardTitle } from './cardTypes';

import type { Protocol, ProtocolCard, ProtocolCardType } from '@odysseus/shared-schemas';

interface Placement {
  page: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function createCard<Type extends ProtocolCardType>(
  type: Type,
  placement: Placement
): ProtocolCard {
  const cardType = CARD_TYPES[type];
  return {
    id: createId(),
    type,
    title: defaultCardTitle(type),
    isCollapsed: false,
    ...placement,
    ...cardType.createContent(),
  } as ProtocolCard;
}

const NEW_CARD_WIDTH = 12;

export function firstCardOrNew<Type extends ProtocolCardType>(
  draft: Protocol,
  type: Type
): Extract<ProtocolCard, { type: Type }> {
  const isWanted = (card: ProtocolCard): card is Extract<ProtocolCard, { type: Type }> =>
    card.type === type;
  const existing = draft.cards.find(isWanted);
  if (existing) return existing;
  const page = draft.pages[0].id;
  const bottom = Math.max(
    0,
    ...draft.cards.filter(card => card.page === page).map(card => card.y + card.h)
  );
  const created = createCard(type, {
    page,
    x: 0,
    y: bottom,
    w: NEW_CARD_WIDTH,
    h: CARD_TYPES[type].size[1],
  });
  draft.cards.push(created);
  return created as Extract<ProtocolCard, { type: Type }>;
}
