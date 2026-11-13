import { normalizeVesselMap, type VesselMapBlock } from '@odysseus/shared-schemas';

import {
  heldNames,
  nameElsewhere,
  removeLineFromWells,
  setWellsAmount,
  setWellsText,
  setWellsUnit,
  wellRows,
} from './wellEdits';

const vesselMap = (content: Partial<VesselMapBlock> = {}) =>
  ({
    lines: [],
    cells: {},
    series: {},
    counts: {},
    amountNames: {},
    ...content,
  }) as VesselMapBlock;

const edit = (block: VesselMapBlock, change: (draft: VesselMapBlock) => void) => {
  change(block);
  normalizeVesselMap(block);
  return block;
};

describe('editing wells', () => {
  it('starts a line when typing into wells that have none, uncolored while it is the only value', () => {
    const block = edit(vesselMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    expect(block.lines).toHaveLength(1);
    expect(block.lines[0].values).toEqual([{ id: expect.any(String), text: 'Aspirin' }]);
    expect(Object.keys(block.cells)).toEqual(['p:A1', 'p:A2']);
  });

  it('renames a value held only by the selected wells, so it keeps its color while typing', () => {
    const block = edit(vesselMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Asp'));
    const [value] = block.lines[0].values;
    edit(block, draft => setWellsText(draft, ['p:A1'], block.lines[0].id, 'Aspirin'));
    expect(block.lines[0].values).toEqual([{ ...value, text: 'Aspirin' }]);
  });

  it('gives a new value to selected wells that share theirs with other wells', () => {
    const block = edit(vesselMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    const lineId = block.lines[0].id;
    edit(block, draft => setWellsText(draft, ['p:A2'], lineId, 'brufen'));
    expect(block.lines[0].values.map(({ text, color }) => [text, color])).toEqual([
      ['Aspirin', '#6fa8e8'],
      ['brufen', '#5cc8bd'],
    ]);
  });

  it('reuses a value typed with different case', () => {
    const block = edit(vesselMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    const lineId = block.lines[0].id;
    edit(block, draft => setWellsText(draft, ['p:A3'], lineId, ' ASPIRIN'));
    expect(block.lines[0].values).toHaveLength(1);
    expect(block.cells['p:A3'][lineId].valueId).toBe(block.lines[0].values[0].id);
  });

  it('keeps a chosen unit before an amount is typed, and clears amounts from a series', () => {
    const block = edit(vesselMap(), draft => setWellsUnit(draft, ['p:A1'], undefined, 'µM'));
    const lineId = block.lines[0].id;
    expect(block.cells['p:A1'][lineId]).toEqual({ unit: 'µM' });
    block.cells['p:A1'][lineId] = { seriesId: 's', seriesStep: 1, unit: 'µM' };
    edit(block, draft => setWellsAmount(draft, ['p:A1'], lineId, '10'));
    expect(block.cells['p:A1'][lineId]).toEqual({ amount: '10', unit: 'µM' });
  });

  it('reads shared and mixed contents for the editor rows', () => {
    const block = edit(vesselMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Aspirin'));
    const lineId = block.lines[0].id;
    edit(block, draft => setWellsText(draft, ['p:A2'], lineId, 'Brufen'));
    edit(block, draft => setWellsAmount(draft, ['p:A1', 'p:A2'], lineId, '5'));
    expect(wellRows(block, ['p:A1', 'p:A2'], block.lines[0])).toMatchObject([
      { text: '', isTextMixed: true, amount: '5', isAmountMixed: false },
    ]);
  });

  it('drops a line no well uses after it is removed', () => {
    const block = edit(vesselMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Aspirin'));
    edit(block, draft => removeLineFromWells(draft, ['p:A1'], block.lines[0].id));
    expect(block.lines).toEqual([]);
    expect(block.cells).toEqual({});
  });
});

describe('names shared across the selection', () => {
  const twoPlates = () =>
    vesselMap({
      plates: [
        { id: 'p1', vessel: '384', name: 'P1 - Flat bottom' },
        { id: 'p2', vessel: '384', name: 'P2 - V-bottom' },
      ],
      lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'HCKA' }] }],
      cells: {
        'p1:A1': { l: { valueId: 'v' } },
        'p1:A2': { l: { valueId: 'v' } },
        'p2:A1': { l: { valueId: 'v' } },
      },
    });

  it('reads what the selected wells hold on each line', () => {
    expect(heldNames(twoPlates(), ['p2:A1'])).toEqual(
      new Map([['l', { valueId: 'v', text: 'HCKA' }]])
    );
  });

  it('counts the other wells with the name and names their plate', () => {
    expect(nameElsewhere(twoPlates(), 'l', 'v', ['p2:A1'])).toEqual({
      text: 'HCKA',
      wellCount: 2,
      vesselName: 'P1 - Flat bottom',
    });
    expect(nameElsewhere(twoPlates(), 'l', 'v', ['p1:A1', 'p1:A2', 'p2:A1'])).toBeUndefined();
  });
});
