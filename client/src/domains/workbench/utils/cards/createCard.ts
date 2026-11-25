import { createId } from '../ids/createId';

import { CARD_TYPES, defaultCardTitle } from './cardTypes';

import type {
  PlateMapCard,
  Protocol,
  ProtocolCard,
  ProtocolCardType,
} from '@odysseus/shared-schemas';

interface Placement {
  page: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type TitledCardType = Exclude<ProtocolCardType, 'plateMap'>;

export function createCard<Type extends TitledCardType>(
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

export const firstCardIdOf = (
  protocol: Pick<Protocol, 'cards'>,
  type: ProtocolCardType
): string | undefined => protocol.cards.find(card => card.type === type)?.id;

export const cardsShowing = (cards: readonly ProtocolCard[], plateMapId: string): PlateMapCard[] =>
  cards.filter(
    (card): card is PlateMapCard => card.type === 'plateMap' && card.shows === plateMapId
  );

export const cardIdShowing = (
  protocol: Pick<Protocol, 'cards'>,
  plateMapId: string
): string | undefined => cardsShowing(protocol.cards, plateMapId)[0]?.id;

export function showPlateMap(
  draft: Pick<Protocol, 'cards'>,
  plateMapId: string,
  placement: Placement,
  side: PlateMapCard['side']
): PlateMapCard {
  const card: PlateMapCard = {
    id: createId(),
    type: 'plateMap',
    isCollapsed: false,
    ...placement,
    ...CARD_TYPES.plateMap.createContent(),
    shows: plateMapId,
    side,
  };
  draft.cards.push(card);
  return card;
}

export function firstCardOrNew<Type extends TitledCardType>(
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
