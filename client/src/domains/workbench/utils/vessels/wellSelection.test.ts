import { sheetOf, vesselTabs } from './vesselTabs';
import { copyWells, keysInRect, movedPoint, pasteTargets } from './wellSelection';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const block = {
  plates: [{ id: 'p', vessel: '6', name: '' }],
  sets: [],
  cells: { 'p:A1': { drug: { valueId: 'x' } }, 'p:A2': { drug: { valueId: 'y' } } },
} as unknown as VesselMapBlock;
const sheet = sheetOf(block, vesselTabs(block)[0]);

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

  it('pastes copied wells in the same layout from the top-left of the new selection', () => {
    const copied = copyWells(block, sheet, new Set(['p:A1', 'p:A2']));
    const targets = pasteTargets(sheet, copied, new Set(['p:B2']));
    expect(targets).toEqual([
      { key: 'p:B2', lines: { drug: { valueId: 'x' } } },
      { key: 'p:B3', lines: { drug: { valueId: 'y' } } },
    ]);
  });

  it('drops copied wells that would land off the plate', () => {
    const copied = copyWells(block, sheet, new Set(['p:A1', 'p:A2']));
    expect(pasteTargets(sheet, copied, new Set(['p:B3'])).map(({ key }) => key)).toEqual(['p:B3']);
  });
});
