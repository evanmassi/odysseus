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

import type { PlateMapBlock } from '@odysseus/shared-schemas';

const plateMap = (): PlateMapBlock =>
  ({
    id: 'map',
    x: 0,
    y: 0,
    w: 6,
    h: 10,
    plates: [{ id: 'p', vessel: '96', name: 'Day 1' }],
    sets: [{ id: 's', vessel: 'T75', count: 3 }],
    activeTab: 1,
    lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'Drug' }] }],
    cells: {
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
  }) as unknown as PlateMapBlock;

describe('plate map edits', () => {
  it('add and remove plates and other labware by count', () => {
    const block = plateMap();
    const more = withLabwareCount(block, '96', 2);
    expect(labwareCountOf(more, '96')).toBe(2);
    expect(withLabwareCount(block, 'T75', 1).sets).toEqual([{ id: 's', vessel: 'T75', count: 1 }]);
    expect(withLabwareCount(block, 'T75', 0).sets).toEqual([]);
    expect(withLabwareCount(block, 'facs', 2).sets).toHaveLength(2);
    expect(hasAnyLabware(withoutPlate(withLabwareCount(block, 'T75', 0), 'p'))).toBe(false);
  });

  it('count the filled wells a change would drop', () => {
    const block = plateMap();
    expect(wellsLostTo(block, withLabwareCount(block, 'T75', 2))).toBe(1);
    expect(wellsLostTo(block, withoutPlate(block, 'p'))).toBe(2);
  });

  it('drop wells that no longer fit and size the card to a new only plate', () => {
    const block = plateMap();
    block.stain = { 'p:A1': 'full', 's#2:1': 'fmo' };
    const next = withLabwareCount(withLabwareCount(block, '96', 0), '6', 1);
    applyLabware(block, next);
    expect(Object.keys(block.cells)).toEqual(['s#2:1']);
    expect(block.stain).toEqual({ 's#2:1': 'fmo' });
    expect(block.w).toBe(4);
    expect(block.activeTab).toBe(1);
  });

  it('duplicates a plate tab into a new card beside this one with fresh well keys', () => {
    const block = plateMap();
    block.stain = { 'p:A1': 'full', 's#2:1': 'fmo' };
    const copy = duplicateOfTab(block, plateMapTabs(block)[0]);
    const [plate] = copy.plates;
    expect(plate).toMatchObject({ vessel: '96', name: 'Day 1 copy' });
    expect(plate.id).not.toBe('p');
    expect(copy.sets).toEqual([]);
    expect(Object.keys(copy.cells).sort()).toEqual([`${plate.id}:A1`, `${plate.id}:H12`]);
    expect(copy.stain).toEqual({ [`${plate.id}:A1`]: 'full' });
    expect(copy.counts).toEqual({});
    expect(copy).toMatchObject({ x: 6, y: 0, activeTab: 0 });
  });

  it('duplicates a plate into a new tab of the same card with series of its own', () => {
    const block = plateMap();
    block.cells['p:B1'] = { l: { valueId: 'v', seriesId: 'ser', seriesStep: 0 } };
    block.series = { ser: { start: '10', unit: 'µM', fold: '3', direction: 'right' } };
    block.stain = { 'p:A1': 'full' };
    duplicatePlateAsTab(block, block.plates[0]);
    const [original, copy] = block.plates;
    expect(original.id).toBe('p');
    expect(copy).toMatchObject({ vessel: '96', name: 'Day 1 copy' });
    expect(block.activeTab).toBe(1);
    expect(block.cells[`${copy.id}:A1`]).toEqual({ l: { valueId: 'v' } });
    expect(block.stain).toEqual({ 'p:A1': 'full', [`${copy.id}:A1`]: 'full' });
    const copiedSeriesId = block.cells[`${copy.id}:B1`]['l'].seriesId;
    expect(copiedSeriesId).not.toBe('ser');
    expect(block.series[copiedSeriesId ?? '']).toEqual(block.series['ser']);
    expect(block.cells['s#2:1']).toEqual({ l: { valueId: 'v' } });
  });
});
