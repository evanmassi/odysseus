import { normalizeVesselMap, type VesselMapBlock } from '@odysseus/shared-schemas';

import {
  heldNames,
  lineNamed,
  moveWellsToLine,
  nameElsewhere,
  removeLineFromWells,
  renameLine,
  setWellsAmount,
  setWellsText,
  setWellsUnit,
  startingLineId,
  wellRows,
} from './wellEdits';

const vesselMap = (content: Partial<VesselMapBlock> = {}) =>
  ({
    lines: [],
    cells: {},
    series: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
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
    expect(wellRows(block, ['p:A1', 'p:A2'])).toMatchObject([
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
      lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'STX' }] }],
      cells: {
        'p1:A1': { l: { valueId: 'v' } },
        'p1:A2': { l: { valueId: 'v' } },
        'p2:A1': { l: { valueId: 'v' } },
      },
    });

  it('reads what the selected wells hold on each line', () => {
    expect(heldNames(twoPlates(), ['p2:A1'])).toEqual(
      new Map([['l', { valueId: 'v', text: 'STX' }]])
    );
  });

  it('counts the other wells with the name and names their plate', () => {
    expect(nameElsewhere(twoPlates(), 'l', 'v', ['p2:A1'])).toEqual({
      text: 'STX',
      wellCount: 2,
      vesselName: 'P1 - Flat bottom',
    });
    expect(nameElsewhere(twoPlates(), 'l', 'v', ['p1:A1', 'p1:A2', 'p2:A1'])).toBeUndefined();
  });
});

describe('renameLine', () => {
  it('names a line, and clearing the name falls back to none', () => {
    const block = vesselMap({ lines: [{ id: 'l', name: '', role: 'auto', values: [] }] });
    renameLine(block, 'l', '  Stimulus ');
    expect(block.lines[0].name).toBe('Stimulus');
    renameLine(block, 'l', '');
    expect(block.lines[0].name).toBe('');
  });
});

describe('one line per name', () => {
  const donorLine = (index: number) => ({
    id: `d${index}`,
    name: index === 1 ? 'Donors' : ' donors ',
    role: 'auto' as const,
    values: [{ id: `v${index}`, text: `Donor ${index}` }],
  });

  it('merges same-named lines that share no well into one line with every value', () => {
    const block = edit(
      vesselMap({
        lines: [1, 2, 3, 4, 5].map(donorLine),
        cells: Object.fromEntries(
          [1, 2, 3, 4, 5].map(index => [`p:A${index}`, { [`d${index}`]: { valueId: `v${index}` } }])
        ),
      }),
      () => undefined
    );
    expect(block.lines).toHaveLength(1);
    expect(block.lines[0].name).toBe('Donors');
    expect(block.lines[0].values.map(value => value.text)).toEqual([
      'Donor 1',
      'Donor 2',
      'Donor 3',
      'Donor 4',
      'Donor 5',
    ]);
    expect(block.cells['p:A5']).toEqual({ d1: { valueId: 'v5' } });
  });

  it('keeps same-named lines apart when a well holds both, and never merges unnamed lines', () => {
    const block = edit(
      vesselMap({
        lines: [
          donorLine(1),
          donorLine(2),
          { id: 'u1', name: '', role: 'auto', values: [{ id: 'x', text: 'Heat' }] },
          { id: 'u2', name: '', role: 'auto', values: [{ id: 'y', text: 'Cold' }] },
        ],
        cells: {
          'p:A1': { d1: { valueId: 'v1' }, d2: { valueId: 'v2' } },
          'p:A2': { u1: { valueId: 'x' } },
          'p:A3': { u2: { valueId: 'y' } },
        },
      }),
      () => undefined
    );
    expect(block.lines.map(line => line.id)).toEqual(['d1', 'd2', 'u1', 'u2']);
  });
});

describe('putting wells on another line', () => {
  const stimulated = () =>
    vesselMap({
      lines: [
        { id: 's', name: 'Stimulations', role: 'auto', values: [{ id: 'lps', text: 'LPS' }] },
        {
          id: 'n',
          name: '',
          role: 'auto',
          values: [{ id: 'none', text: 'Unstimulated', color: '#7d8494' }],
        },
      ],
      cells: {
        'p:B1': { s: { valueId: 'lps', amount: '10', unit: 'ng/mL' } },
        'p:N1': { n: { valueId: 'none', amount: '2', unit: 'µL' } },
        'p:O1': { n: { valueId: 'none', amount: '2', unit: 'µL' } },
      },
      amountNames: { 'a:n:unstimulated-perwell': 'Medium per well' },
    });

  it('moves the label, amount and color, and carries a typed amount name', () => {
    const block = edit(stimulated(), draft => moveWellsToLine(draft, ['p:N1', 'p:O1'], 'n', 's'));
    expect(block.lines.map(line => line.name)).toEqual(['Stimulations']);
    const unstimulated = block.lines[0].values.find(value => value.text === 'Unstimulated');
    expect(unstimulated?.color).toBe('#7d8494');
    expect(block.cells['p:N1']).toEqual({
      s: { valueId: unstimulated?.id, amount: '2', unit: 'µL' },
    });
    expect(block.amountNames).toEqual({ 'a:s:unstimulated-perwell': 'Medium per well' });
  });

  it('leaves the amount name behind while other wells still hold the label there', () => {
    const block = stimulated();
    block.cells['p:O1']['s'] = { valueId: 'lps' };
    edit(block, draft => moveWellsToLine(draft, ['p:N1'], 'n', 's'));
    expect(block.lines).toHaveLength(2);
    expect(block.amountNames).toEqual({ 'a:n:unstimulated-perwell': 'Medium per well' });
  });

  it('finds a line by name, ignoring lines the selected wells are already on', () => {
    expect(lineNamed(stimulated(), ['p:N1'], 'stimulations ')?.id).toBe('s');
    expect(lineNamed(stimulated(), ['p:B1'], 'Stimulations')).toBeUndefined();
    expect(lineNamed(stimulated(), ['p:N1'], '')).toBeUndefined();
  });

  it('starts empty wells on a line of their own, and filled wells on their first line', () => {
    const block = stimulated();
    expect(startingLineId(block, ['p:A1'])).toBeUndefined();
    expect(startingLineId(block, ['p:N1'])).toBe('n');
  });
});
