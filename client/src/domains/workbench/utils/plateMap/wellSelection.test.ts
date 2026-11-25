import { sheetOf, plateMapTabs } from './plateMapTabs';
import { copyWells, keysInRect, movedPoint, pasteTargets } from './wellSelection';

import type { PlateMap } from '@odysseus/shared-schemas';

const plateMap = {
  plates: [{ id: 'p', labware: '6', name: '' }],
  otherLabware: [],
  samples: { 'p:A1': { drug: { valueId: 'x' } }, 'p:A2': { drug: { valueId: 'y' } } },
  stain: { 'p:A1': 'full' },
  stainedIn: {},
} as unknown as PlateMap;
const sheet = sheetOf(plateMap, plateMapTabs(plateMap)[0]);

describe('well selection', () => {
  it('picks every well in the rectangle between two corners, either way round', () => {
    expect(keysInRect(sheet, { row: 1, col: 2 }, { row: 0, col: 1 })).toEqual([
      'p:A2',
      'p:A3',
      'p:B2',
      'p:B3',
    ]);
  });

  it('keeps the cursor on the plate', () => {
    expect(movedPoint(sheet, { row: 1, col: 2 }, 1, 1)).toEqual({ row: 1, col: 2 });
    expect(movedPoint(sheet, { row: 0, col: 0 }, 0, -1)).toEqual({ row: 0, col: 0 });
  });

  it('pastes copied wells and their stains in the same layout from the top-left of the new selection', () => {
    const copied = copyWells(plateMap, sheet, new Set(['p:A1', 'p:A2']));
    const targets = pasteTargets(sheet, copied, new Set(['p:B2']));
    expect(targets).toEqual([
      { key: 'p:B2', lines: { drug: { valueId: 'x' } }, stainId: 'full' },
      { key: 'p:B3', lines: { drug: { valueId: 'y' } }, stainId: undefined },
    ]);
  });

  it('drops copied wells that would land off the plate', () => {
    const copied = copyWells(plateMap, sheet, new Set(['p:A1', 'p:A2']));
    expect(pasteTargets(sheet, copied, new Set(['p:B3'])).map(({ key }) => key)).toEqual(['p:B3']);
  });
});
