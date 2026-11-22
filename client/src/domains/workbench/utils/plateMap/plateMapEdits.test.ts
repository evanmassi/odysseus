import {
  applyLabware,
  duplicatePlateAsTab,
  duplicateOfTab,
  hasAnyLabware,
  labwareCountOf,
  wellsLostTo,
  withoutPlate,
  withLabwareCount,
} from './plateMapEdits';
import { plateMapTabs } from './plateMapTabs';

import type { PlateMapCard } from '@odysseus/shared-schemas';

const plateMap = (): PlateMapCard =>
  ({
    id: 'map',
    x: 0,
    y: 0,
    w: 6,
    h: 10,
    plates: [{ id: 'p', labware: '96', name: 'Day 1' }],
    otherLabware: [{ id: 's', labware: 'T75', count: 3 }],
    activeTab: 1,
    lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'Drug' }] }],
    samples: {
      'p:H12': { l: { valueId: 'v' } },
      'p:A1': { l: { valueId: 'v' } },
      's#2:1': { l: { valueId: 'v' } },
    },
    series: {},
    counts: { v: '9' },
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
  }) as unknown as PlateMapCard;

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

  it('drop wells that no longer fit and size the card to a new only plate', () => {
    const card = plateMap();
    card.stain = { 'p:A1': 'full', 's#2:1': 'fmo' };
    const next = withLabwareCount(withLabwareCount(card, '96', 0), '6', 1);
    applyLabware(card, next);
    expect(Object.keys(card.samples)).toEqual(['s#2:1']);
    expect(card.stain).toEqual({ 's#2:1': 'fmo' });
    expect(card.w).toBe(4);
    expect(card.activeTab).toBe(1);
  });

  it('duplicates a plate tab into a new card beside this one with fresh well keys', () => {
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
    expect(copy).toMatchObject({ x: 6, y: 0, activeTab: 0 });
  });

  it('duplicates a plate into a new tab of the same card with series of its own', () => {
    const card = plateMap();
    card.samples['p:B1'] = { l: { valueId: 'v', seriesId: 'ser', seriesPoint: 0 } };
    card.series = { ser: { top: '10', unit: 'µM', dilutionFactor: '3', direction: 'right' } };
    card.stain = { 'p:A1': 'full' };
    duplicatePlateAsTab(card, card.plates[0]);
    const [original, copy] = card.plates;
    expect(original.id).toBe('p');
    expect(copy).toMatchObject({ labware: '96', name: 'Day 1 copy' });
    expect(card.activeTab).toBe(1);
    expect(card.samples[`${copy.id}:A1`]).toEqual({ l: { valueId: 'v' } });
    expect(card.stain).toEqual({ 'p:A1': 'full', [`${copy.id}:A1`]: 'full' });
    const copiedSeriesId = card.samples[`${copy.id}:B1`]['l'].seriesId;
    expect(copiedSeriesId).not.toBe('ser');
    expect(card.series[copiedSeriesId ?? '']).toEqual(card.series['ser']);
    expect(card.samples['s#2:1']).toEqual({ l: { valueId: 'v' } });
  });
});
