import {
  applyLabware,
  duplicatePlateAsTab,
  duplicateOfTab,
  hasAnyLabware,
  labwareCountOf,
  removePlateMap,
  wellsLostTo,
  withoutPlate,
  withLabwareCount,
} from './plateMapEdits';
import { plateMapTabs } from './plateMapTabs';

import type { PlateMap, PlateMapCard } from '@odysseus/shared-schemas';

const plateMap = (): PlateMap => ({
  id: 'map',
  title: '',
  plates: [{ id: 'p', labware: '96', name: 'Day 1' }],
  otherLabware: [{ id: 's', labware: 'T75', count: 3 }],
  lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'Drug' }] }],
  samples: {
    'p:H12': { l: { valueId: 'v' } },
    'p:A1': { l: { valueId: 'v' } },
    's#2:1': { l: { valueId: 'v' } },
  },
  seriesDirections: {},
  counts: { v: '9' },
  amountNames: {},
  stain: {},
  stainedIn: {},
});

const cardShowing = (plateMapId: string): PlateMapCard => ({
  id: 'card',
  type: 'plateMap',
  page: 'page',
  x: 0,
  y: 0,
  w: 6,
  h: 10,
  isCollapsed: false,
  shows: plateMapId,
  side: 'assay',
  activeTab: 1,
  showsReplicatesAsOne: true,
});

describe('plate map edits', () => {
  it('add and remove plates and other labware by count', () => {
    const card = plateMap();
    const more = withLabwareCount(card, '96', 2);
    expect(labwareCountOf(more, '96')).toBe(2);
    expect(withLabwareCount(card, 'T75', 1).otherLabware).toEqual([
      { id: 's', labware: 'T75', count: 1 },
    ]);
    expect(withLabwareCount(card, 'T75', 0).otherLabware).toEqual([]);
    expect(withLabwareCount(card, 'facs', 2).otherLabware).toHaveLength(2);
    expect(hasAnyLabware(withoutPlate(withLabwareCount(card, 'T75', 0), 'p'))).toBe(false);
  });

  it('count the filled wells a change would drop', () => {
    const card = plateMap();
    expect(wellsLostTo(card, withLabwareCount(card, 'T75', 2))).toBe(1);
    expect(wellsLostTo(card, withoutPlate(card, 'p'))).toBe(2);
  });

  it('drop wells that no longer fit and size the cards showing a new only plate', () => {
    const shown = plateMap();
    shown.stain = { 'p:A1': 'full', 's#2:1': 'fmo' };
    const card = cardShowing(shown.id);
    const next = withLabwareCount(withLabwareCount(shown, '96', 0), '6', 1);
    applyLabware({ cards: [card], plateMaps: [shown] }, shown.id, next);
    expect(Object.keys(shown.samples)).toEqual(['s#2:1']);
    expect(shown.stain).toEqual({ 's#2:1': 'fmo' });
    expect(card.w).toBe(4);
  });

  it('duplicates a plate tab into a new plate map with fresh well keys', () => {
    const card = plateMap();
    card.stain = { 'p:A1': 'full', 's#2:1': 'fmo' };
    const copy = duplicateOfTab(card, plateMapTabs(card)[0]);
    const [plate] = copy.plates;
    expect(plate).toMatchObject({ labware: '96', name: 'Day 1 copy' });
    expect(plate.id).not.toBe('p');
    expect(copy.otherLabware).toEqual([]);
    expect(Object.keys(copy.samples).sort()).toEqual([`${plate.id}:A1`, `${plate.id}:H12`]);
    expect(copy.stain).toEqual({ [`${plate.id}:A1`]: 'full' });
    expect(copy.counts).toEqual({});
    expect(copy.id).not.toBe('map');
  });

  it('duplicates a plate into a new tab of the same card, sharing its series', () => {
    const card = plateMap();
    card.samples['p:B1'] = { l: { valueId: 'v', seriesId: 'ser', seriesPoint: 0 } };
    card.stain = { 'p:A1': 'full' };
    const copyTab = duplicatePlateAsTab(card, card.plates[0]);
    const [original, copy] = card.plates;
    expect(original.id).toBe('p');
    expect(copy).toMatchObject({ labware: '96', name: 'Day 1 copy' });
    expect(copyTab).toBe(1);
    expect(card.samples[`${copy.id}:A1`]).toEqual({ l: { valueId: 'v' } });
    expect(card.stain).toEqual({ 'p:A1': 'full', [`${copy.id}:A1`]: 'full' });
    expect(card.samples[`${copy.id}:B1`]['l'].seriesId).toBe('ser');
    expect(card.samples['s#2:1']).toEqual({ l: { valueId: 'v' } });
  });
});

describe('removePlateMap', () => {
  it('removes the plate map and closes only the cards showing it', () => {
    const kept = { ...plateMap(), id: 'other' };
    const draft = {
      plateMaps: [plateMap(), kept],
      cards: [cardShowing('map'), { ...cardShowing('other'), id: 'card-2' }, cardShowing('map')],
    };
    removePlateMap(draft, 'map');
    expect(draft.plateMaps).toEqual([kept]);
    expect(draft.cards.map(card => card.id)).toEqual(['card-2']);
  });
});
