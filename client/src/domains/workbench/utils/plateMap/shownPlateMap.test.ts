import { cardsShowing } from '../cards/createCard';

import { newPlateMap } from './plateMapEdits';
import { shownPlateMap } from './shownPlateMap';

import type { PlateMapCard } from '@odysseus/shared-schemas';

const plateCard = (id: string, shows: string): PlateMapCard => ({
  id,
  type: 'plateMap',
  page: 'plates',
  x: 0,
  y: 0,
  w: 6,
  h: 10,
  isCollapsed: false,
  shows,
  side: 'stain',
  activeTab: 1,
  showsReplicatesAsOne: false,
});

describe('a plate map shown by a card', () => {
  it('finds every card that shows a plate map', () => {
    const cards = [plateCard('c1', 'map'), plateCard('c2', 'other'), plateCard('c3', 'map')];
    expect(cardsShowing(cards, 'map').map(card => card.id)).toEqual(['c1', 'c3']);
  });

  it("shows the plate map's own data with the card's side, tab and replicates", () => {
    const plateMap = { ...newPlateMap(), stain: { 'p:A1': 'full' } };
    const shown = shownPlateMap(plateMap, plateCard('c1', plateMap.id));
    expect(shown).toMatchObject({
      id: plateMap.id,
      side: 'stain',
      activeTab: 1,
      showsReplicatesAsOne: false,
      stain: { 'p:A1': 'full' },
    });
  });
});
