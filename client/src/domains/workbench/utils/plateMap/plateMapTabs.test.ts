import {
  activeTabOf,
  labwareTitle,
  sheetOf,
  otherLabwareKinds,
  plateMapTabs,
} from './plateMapTabs';

import type { ShownPlateMap } from './shownPlateMap';

const plateMap = {
  plates: [{ id: 'p1', labware: '6', name: '' }],
  otherLabware: [
    { id: 's1', labware: 'T75', count: 2 },
    { id: 's2', labware: 'T25', count: 1 },
    { id: 's3', labware: 'tube15', count: 2 },
  ],
  activeTab: 9,
} as ShownPlateMap;

describe('plate map tabs', () => {
  it('give each plate a tab and all other labware one shared tab', () => {
    expect(plateMapTabs(plateMap).map(tab => tab.id)).toEqual(['p1', 'otherLabware']);
    expect(activeTabOf(plateMap).kind).toBe('otherLabware');
    expect(otherLabwareKinds(plateMap)).toBe('Flasks & tubes');
  });

  it('names the card after what it holds unless it was renamed', () => {
    const titled = (title: string, parts: Partial<ShownPlateMap>) =>
      labwareTitle({ ...plateMap, title, ...parts } as ShownPlateMap);
    expect(titled('', { otherLabware: [] })).toBe('Plate map');
    expect(titled(' ', { plates: [] })).toBe('Flasks & tubes');
    expect(titled('', {})).toBe('Plates, flasks & tubes');
    expect(titled('Assay plate', { otherLabware: [] })).toBe('Assay plate');
  });

  it('lay a plate out row by row with lettered rows', () => {
    const sheet = sheetOf(plateMap, plateMapTabs(plateMap)[0]);
    expect(sheet).toMatchObject({ isPlate: true, rows: 2, cols: 3 });
    expect(sheet.positions.map(position => position.key)).toEqual([
      'p1:A1',
      'p1:A2',
      'p1:A3',
      'p1:B1',
      'p1:B2',
      'p1:B3',
    ]);
  });

  it('number other labware on from earlier rows of the same kind', () => {
    const sheet = sheetOf(plateMap, plateMapTabs(plateMap)[1]);
    expect(sheet.positions.map(({ key, label }) => [key, label])).toEqual([
      ['s1#0:1', 'F1'],
      ['s1#1:1', 'F2'],
      ['s2#0:1', 'F3'],
      ['s3#0:1', 'T1'],
      ['s3#1:1', 'T2'],
    ]);
  });
});
