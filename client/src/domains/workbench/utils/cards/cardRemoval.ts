import { cardsShowing } from './createCard';

import type { Protocol, ProtocolCard } from '@odysseus/shared-schemas';

const pageName = (protocol: Pick<Protocol, 'pages'>, pageId: string) =>
  protocol.pages.find(page => page.id === pageId)?.name ?? 'another page';

export function removalMessage(
  protocol: Pick<Protocol, 'pages' | 'cards'>,
  card: ProtocolCard
): string {
  if (card.type !== 'plateMap') return `Remove the "${card.title}" card from this page?`;
  const [other] = cardsShowing(protocol.cards, card.shows).filter(shown => shown.id !== card.id);
  return other
    ? `Remove this card? Its plates stay on ${pageName(protocol, other.page)}.`
    : 'Remove this card? Its plates stay in the protocol, under Not shown when you add a Plate map.';
}
