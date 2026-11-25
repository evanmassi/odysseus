import { removalMessage } from './cardRemoval';

import type { PlateMapCard, Protocol } from '@odysseus/shared-schemas';

const plateCard = (id: string, page: string): PlateMapCard => ({
  id,
  type: 'plateMap',
  page,
  x: 0,
  y: 0,
  w: 6,
  h: 10,
  isCollapsed: false,
  shows: 'map',
  side: 'assay',
  activeTab: 0,
  showsReplicatesAsOne: true,
});

const protocolWith = (...cards: Protocol['cards']): Pick<Protocol, 'pages' | 'cards'> => ({
  pages: [
    { id: 'plates', name: 'Plates', steps: [] },
    { id: 'takedown', name: 'Takedown', steps: [] },
  ],
  cards,
});

describe('removalMessage', () => {
  it('says where the plates stay when another card shows them', () => {
    const card = plateCard('c1', 'plates');
    expect(removalMessage(protocolWith(card, plateCard('c2', 'takedown')), card)).toBe(
      'Remove this card? Its plates stay on Takedown.'
    );
  });

  it('says the plates wait under Not shown when no other card shows them', () => {
    const card = plateCard('c1', 'plates');
    expect(removalMessage(protocolWith(card), card)).toBe(
      'Remove this card? Its plates stay in the protocol, under Not shown when you add a Plate map.'
    );
  });
});
