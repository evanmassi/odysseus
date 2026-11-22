import { labwareTitle } from '../plateMap/plateMapTabs';

import type {
  LinkedPlateMapCard,
  Protocol,
  ProtocolCard,
  PlateMapCard,
} from '@odysseus/shared-schemas';

export const linkedPlateMapsOf = (
  cards: readonly ProtocolCard[],
  plateId: string
): LinkedPlateMapCard[] =>
  cards.filter(
    (card): card is LinkedPlateMapCard => card.type === 'linkedPlateMap' && card.shows === plateId
  );

export const shownPlate = (source: PlateMapCard, view: LinkedPlateMapCard): PlateMapCard => ({
  ...source,
  side: view.side,
  activeTab: view.activeTab,
  showsReplicatesAsOne: view.showsReplicatesAsOne,
});

const pageName = (protocol: Pick<Protocol, 'pages'>, pageId: string) =>
  protocol.pages.find(page => page.id === pageId)?.name ?? 'another page';

export function removalMessage(
  protocol: Pick<Protocol, 'pages' | 'cards'>,
  card: ProtocolCard
): string {
  const title = card.type === 'plateMap' ? labwareTitle(card) : card.title;
  const asked = `Remove the "${title}" card from this page?`;
  if (card.type === 'linkedPlateMap') {
    const source = protocol.cards.find(candidate => candidate.id === card.shows);
    return source
      ? `Remove this card? Its plates stay on ${pageName(protocol, source.page)}.`
      : asked;
  }
  const [heir] = card.type === 'plateMap' ? linkedPlateMapsOf(protocol.cards, card.id) : [];
  return heir
    ? `${asked} Its plates move to the card on ${pageName(protocol, heir.page)}, so nothing is lost.`
    : asked;
}

export function removeCard(draft: Protocol, cardId: string): void {
  const removed = draft.cards.find(card => card.id === cardId);
  if (!removed) return;
  const [heir] = removed.type === 'plateMap' ? linkedPlateMapsOf(draft.cards, removed.id) : [];
  if (removed.type !== 'plateMap' || !heir) {
    draft.cards = draft.cards.filter(card => card !== removed);
    return;
  }
  Object.assign(removed, {
    page: heir.page,
    x: heir.x,
    y: heir.y,
    w: heir.w,
    h: heir.h,
    isCollapsed: heir.isCollapsed,
    side: heir.side,
    activeTab: heir.activeTab,
    showsReplicatesAsOne: heir.showsReplicatesAsOne,
  });
  if (heir.expandedHeight === undefined) delete removed.expandedHeight;
  else removed.expandedHeight = heir.expandedHeight;
  draft.cards = draft.cards.filter(card => card !== heir);
}
