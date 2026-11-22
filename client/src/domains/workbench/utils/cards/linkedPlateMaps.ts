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
    (card): card is LinkedPlateMapCard => card.type === 'plateView' && card.shows === plateId
  );

export const shownPlate = (source: PlateMapCard, view: LinkedPlateMapCard): PlateMapCard => ({
  ...source,
  side: view.side,
  activeTab: view.activeTab,
  mergesReplicates: view.mergesReplicates,
});

const pageName = (protocol: Pick<Protocol, 'pages'>, pageId: string) =>
  protocol.pages.find(page => page.id === pageId)?.name ?? 'another page';

export function removalMessage(
  protocol: Pick<Protocol, 'pages' | 'blocks'>,
  card: ProtocolCard
): string {
  const title = card.type === 'plate' ? labwareTitle(card) : card.title;
  const asked = `Remove the "${title}" card from this page?`;
  if (card.type === 'plateView') {
    const source = protocol.blocks.find(candidate => candidate.id === card.shows);
    return source
      ? `Remove this card? Its plates stay on ${pageName(protocol, source.page)}.`
      : asked;
  }
  const [heir] = card.type === 'plate' ? linkedPlateMapsOf(protocol.blocks, card.id) : [];
  return heir
    ? `${asked} Its plates move to the card on ${pageName(protocol, heir.page)}, so nothing is lost.`
    : asked;
}

export function removeCard(draft: Protocol, cardId: string): void {
  const removed = draft.blocks.find(card => card.id === cardId);
  if (!removed) return;
  const [heir] = removed.type === 'plate' ? linkedPlateMapsOf(draft.blocks, removed.id) : [];
  if (removed.type !== 'plate' || !heir) {
    draft.blocks = draft.blocks.filter(card => card !== removed);
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
    mergesReplicates: heir.mergesReplicates,
  });
  if (heir.expandedHeight === undefined) delete removed.expandedHeight;
  else removed.expandedHeight = heir.expandedHeight;
  draft.blocks = draft.blocks.filter(card => card !== heir);
}
