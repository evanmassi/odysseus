import { activeTabOf, sheetOf, shelfKinds, vesselTabs } from './vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const block = {
  plates: [{ id: 'p1', vessel: '6', name: '' }],
  sets: [
    { id: 's1', vessel: 'T75', count: 2 },
    { id: 's2', vessel: 'T25', count: 1 },
    { id: 's3', vessel: 'tube15', count: 2 },
  ],
  activeTab: 9,
} as VesselMapBlock;

describe('vessel tabs', () => {
  it('give each plate a tab and all loose vessels one shared shelf tab', () => {
    expect(vesselTabs(block).map(tab => tab.id)).toEqual(['p1', 'shelf']);
    expect(activeTabOf(block).kind).toBe('shelf');
    expect(shelfKinds(block)).toBe('Flasks & tubes');
  });

  it('lay a plate out row by row with lettered rows', () => {
    const sheet = sheetOf(block, vesselTabs(block)[0]);
    expect(sheet).toMatchObject({ isPlate: true, rows: 2, cols: 3 });
    expect(sheet.spots.map(spot => spot.key)).toEqual([
      'p1:A1',
      'p1:A2',
      'p1:A3',
      'p1:B1',
      'p1:B2',
      'p1:B3',
    ]);
  });

  it('number shelf vessels on from earlier rows of the same kind', () => {
    const sheet = sheetOf(block, vesselTabs(block)[1]);
    expect(sheet.spots.map(({ key, label }) => [key, label])).toEqual([
      ['s1#0:1', 'F1'],
      ['s1#1:1', 'F2'],
      ['s2#0:1', 'F3'],
      ['s3#0:1', 'T1'],
      ['s3#1:1', 'T2'],
    ]);
  });
});
