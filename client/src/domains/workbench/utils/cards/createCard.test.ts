import { cardShowing, openCard } from './createCard';

import type { Protocol, ProtocolCard } from '@odysseus/shared-schemas';

const frame = (id: string, page: string, y = 0) => ({
  id,
  page,
  x: 0,
  y,
  w: 12,
  h: 4,
  isCollapsed: false,
});

const plateCard = (id: string, page: string, shows: string, w = 12): ProtocolCard => ({
  ...frame(id, page),
  w,
  type: 'plateMap',
  shows,
  side: 'assay',
  activeTab: 0,
  showsReplicatesAsOne: true,
});

const titled = (id: string, page: string, type: 'materials' | 'procedure'): ProtocolCard =>
  type === 'materials'
    ? { ...frame(id, page), type, title: 'Materials', foldedGroups: [], isSetAsideOpen: false }
    : { ...frame(id, page), type, title: 'Procedure' };

const board = (cards: ProtocolCard[]): Pick<Protocol, 'cards'> => ({ cards });

describe('cardShowing', () => {
  it('picks the card on this page before one on another', () => {
    const cards = [titled('m1', 'p1', 'materials'), titled('m2', 'p2', 'materials')];
    expect(cardShowing(board(cards), { type: 'materials' }, 'p2')?.id).toBe('m2');
    expect(cardShowing(board(cards), { type: 'materials' }, 'p3')?.id).toBe('m1');
  });

  it('matches a plate card only by the plate map it shows', () => {
    const cards = [plateCard('a', 'p1', 'map-a'), plateCard('b', 'p1', 'map-b')];
    expect(cardShowing(board(cards), { type: 'plateMap', shows: 'map-b' }, 'p1')?.id).toBe('b');
    expect(cardShowing(board(cards), { type: 'plateMap', shows: 'map-c' }, 'p1')).toBeUndefined();
  });

  it('finds a Procedure only on its own page, since each page has its own steps', () => {
    const cards = [titled('proc', 'p1', 'procedure')];
    expect(cardShowing(board(cards), { type: 'procedure' }, 'p1')?.id).toBe('proc');
    expect(cardShowing(board(cards), { type: 'procedure' }, 'p2')).toBeUndefined();
  });
});

describe('openCard', () => {
  it('opens a card at the bottom of the page, as wide as another window onto the same plates', () => {
    const draft = board([
      { ...titled('m', 'p1', 'materials'), y: 3 },
      plateCard('other', 'p2', 'map', 8),
    ]);
    const opened = openCard(draft, { type: 'plateMap', shows: 'map' }, 'p1');
    expect(opened).toMatchObject({ type: 'plateMap', shows: 'map', page: 'p1', y: 7, w: 8 });
    expect(draft.cards).toContain(opened);
  });

  it('opens a titled card at its own size', () => {
    const draft = board([]);
    expect(openCard(draft, { type: 'values' }, 'p1')).toMatchObject({
      type: 'values',
      page: 'p1',
      y: 0,
      w: 4,
      h: 6,
    });
  });
});
