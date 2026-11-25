import { createId } from '../ids/createId';

import { CARD_TYPES, defaultCardTitle } from './cardTypes';

import type {
  FlowCytometryPanelCard,
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

export type ShowingCard = PlateMapCard | FlowCytometryPanelCard;

type TitledCardType = Exclude<ProtocolCardType, ShowingCard['type']>;

export type CardTarget = { type: TitledCardType } | { type: ShowingCard['type']; shows: string };

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

export const pageBottom = (draft: Pick<Protocol, 'cards'>, pageId: string): number =>
  Math.max(0, ...draft.cards.filter(card => card.page === pageId).map(card => card.y + card.h));

export const cardsShowing = (cards: readonly ProtocolCard[], shownId: string): ShowingCard[] =>
  cards.filter((card): card is ShowingCard => 'shows' in card && card.shows === shownId);

export function closeCardsShowing(draft: Pick<Protocol, 'cards'>, shownId: string): void {
  draft.cards = draft.cards.filter(card => !('shows' in card) || card.shows !== shownId);
}

const showsTarget = (card: ProtocolCard, target: CardTarget, pageId: string) =>
  card.type === target.type &&
  (!('shows' in target) || ('shows' in card && card.shows === target.shows)) &&
  (card.type !== 'procedure' || card.page === pageId);

export function cardShowing(
  protocol: Pick<Protocol, 'cards'>,
  target: CardTarget,
  pageId: string
): ProtocolCard | undefined {
  const showing = protocol.cards.filter(card => showsTarget(card, target, pageId));
  return showing.find(card => card.page === pageId) ?? showing[0];
}

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

function showFlowCytometryPanel(
  draft: Pick<Protocol, 'cards'>,
  panelId: string,
  placement: Placement
): FlowCytometryPanelCard {
  const card: FlowCytometryPanelCard = {
    id: createId(),
    type: 'flowCytometryPanel',
    isCollapsed: false,
    ...placement,
    shows: panelId,
  };
  draft.cards.push(card);
  return card;
}

export function openCard(
  draft: Pick<Protocol, 'cards'>,
  target: CardTarget,
  pageId: string
): ProtocolCard {
  const [w, h] = CARD_TYPES[target.type].size;
  const placement = { page: pageId, x: 0, y: pageBottom(draft, pageId), w, h };
  if (!('shows' in target)) {
    const card = createCard(target.type, placement);
    draft.cards.push(card);
    return card;
  }
  const shownWidth = cardsShowing(draft.cards, target.shows)[0]?.w ?? w;
  const shownPlacement = { ...placement, w: shownWidth };
  return target.type === 'plateMap'
    ? showPlateMap(draft, target.shows, shownPlacement, 'assay')
    : showFlowCytometryPanel(draft, target.shows, shownPlacement);
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
  const created = createCard(type, {
    page,
    x: 0,
    y: pageBottom(draft, page),
    w: NEW_CARD_WIDTH,
    h: CARD_TYPES[type].size[1],
  });
  draft.cards.push(created);
  return created as Extract<ProtocolCard, { type: Type }>;
}
