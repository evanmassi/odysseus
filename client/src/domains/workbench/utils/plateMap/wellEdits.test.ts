import { normalizePlateMap, type PlateMapCard } from '@odysseus/shared-schemas';

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

const plateMap = (content: Partial<PlateMapCard> = {}) =>
  ({
    lines: [],
    cells: {},
    series: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
    ...content,
  }) as PlateMapCard;

const edit = (card: PlateMapCard, change: (draft: PlateMapCard) => void) => {
  change(card);
  normalizePlateMap(card);
  return card;
};

describe('editing wells', () => {
  it('starts a line when typing into wells that have none, uncolored while it is the only value', () => {
    const card = edit(plateMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    expect(card.lines).toHaveLength(1);
    expect(card.lines[0].values).toEqual([{ id: expect.any(String), text: 'Aspirin' }]);
    expect(Object.keys(card.cells)).toEqual(['p:A1', 'p:A2']);
  });

  it('renames a value held only by the selected wells, so it keeps its color while typing', () => {
    const card = edit(plateMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Asp'));
    const [value] = card.lines[0].values;
    edit(card, draft => setWellsText(draft, ['p:A1'], card.lines[0].id, 'Aspirin'));
    expect(card.lines[0].values).toEqual([{ ...value, text: 'Aspirin' }]);
  });

  it('gives a new value to selected wells that share theirs with other wells', () => {
    const card = edit(plateMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    const lineId = card.lines[0].id;
    edit(card, draft => setWellsText(draft, ['p:A2'], lineId, 'brufen'));
    expect(card.lines[0].values.map(({ text, color }) => [text, color])).toEqual([
      ['Aspirin', '#6fa8e8'],
      ['brufen', '#5cc8bd'],
    ]);
  });

  it('reuses a value typed with different case', () => {
    const card = edit(plateMap(), draft =>
      setWellsText(draft, ['p:A1', 'p:A2'], undefined, 'Aspirin')
    );
    const lineId = card.lines[0].id;
    edit(card, draft => setWellsText(draft, ['p:A3'], lineId, ' ASPIRIN'));
    expect(card.lines[0].values).toHaveLength(1);
    expect(card.cells['p:A3'][lineId].valueId).toBe(card.lines[0].values[0].id);
  });

  it('keeps a chosen unit before an amount is typed, and clears amounts from a series', () => {
    const card = edit(plateMap(), draft => setWellsUnit(draft, ['p:A1'], undefined, 'µM'));
    const lineId = card.lines[0].id;
    expect(card.cells['p:A1'][lineId]).toEqual({ unit: 'µM' });
    card.cells['p:A1'][lineId] = { seriesId: 's', seriesStep: 1, unit: 'µM' };
    edit(card, draft => setWellsAmount(draft, ['p:A1'], lineId, '10'));
    expect(card.cells['p:A1'][lineId]).toEqual({ amount: '10', unit: 'µM' });
  });

  it('reads shared and mixed contents for the editor rows', () => {
    const card = edit(plateMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Aspirin'));
    const lineId = card.lines[0].id;
    edit(card, draft => setWellsText(draft, ['p:A2'], lineId, 'Brufen'));
    edit(card, draft => setWellsAmount(draft, ['p:A1', 'p:A2'], lineId, '5'));
    expect(wellRows(card, ['p:A1', 'p:A2'])).toMatchObject([
      { text: '', isTextMixed: true, amount: '5', isAmountMixed: false },
    ]);
  });

  it('drops a line no well uses after it is removed', () => {
    const card = edit(plateMap(), draft => setWellsText(draft, ['p:A1'], undefined, 'Aspirin'));
    edit(card, draft => removeLineFromWells(draft, ['p:A1'], card.lines[0].id));
    expect(card.lines).toEqual([]);
    expect(card.cells).toEqual({});
  });
});

describe('names shared across the selection', () => {
  const twoPlates = () =>
    plateMap({
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
      labwareName: 'P1 - Flat bottom',
    });
    expect(nameElsewhere(twoPlates(), 'l', 'v', ['p1:A1', 'p1:A2', 'p2:A1'])).toBeUndefined();
  });
});

describe('renameLine', () => {
  it('names a line, and clearing the name falls back to none', () => {
    const card = plateMap({ lines: [{ id: 'l', name: '', role: 'auto', values: [] }] });
    renameLine(card, 'l', '  Stimulus ');
    expect(card.lines[0].name).toBe('Stimulus');
    renameLine(card, 'l', '');
    expect(card.lines[0].name).toBe('');
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
    const card = edit(
      plateMap({
        lines: [1, 2, 3, 4, 5].map(donorLine),
        cells: Object.fromEntries(
          [1, 2, 3, 4, 5].map(index => [`p:A${index}`, { [`d${index}`]: { valueId: `v${index}` } }])
        ),
      }),
      () => undefined
    );
    expect(card.lines).toHaveLength(1);
    expect(card.lines[0].name).toBe('Donors');
    expect(card.lines[0].values.map(value => value.text)).toEqual([
      'Donor 1',
      'Donor 2',
      'Donor 3',
      'Donor 4',
      'Donor 5',
    ]);
    expect(card.cells['p:A5']).toEqual({ d1: { valueId: 'v5' } });
  });

  it('keeps same-named lines apart when a well holds both, and never merges unnamed lines', () => {
    const card = edit(
      plateMap({
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
    expect(card.lines.map(line => line.id)).toEqual(['d1', 'd2', 'u1', 'u2']);
  });
});

describe('putting wells on another line', () => {
  const stimulated = () =>
    plateMap({
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
    const card = edit(stimulated(), draft => moveWellsToLine(draft, ['p:N1', 'p:O1'], 'n', 's'));
    expect(card.lines.map(line => line.name)).toEqual(['Stimulations']);
    const unstimulated = card.lines[0].values.find(value => value.text === 'Unstimulated');
    expect(unstimulated?.color).toBe('#7d8494');
    expect(card.cells['p:N1']).toEqual({
      s: { valueId: unstimulated?.id, amount: '2', unit: 'µL' },
    });
    expect(card.amountNames).toEqual({ 'a:s:unstimulated-perwell': 'Medium per well' });
  });

  it('leaves the amount name behind while other wells still hold the label there', () => {
    const card = stimulated();
    card.cells['p:O1']['s'] = { valueId: 'lps' };
    edit(card, draft => moveWellsToLine(draft, ['p:N1'], 'n', 's'));
    expect(card.lines).toHaveLength(2);
    expect(card.amountNames).toEqual({ 'a:n:unstimulated-perwell': 'Medium per well' });
  });

  it('finds a line by name, ignoring lines the selected wells are already on', () => {
    expect(lineNamed(stimulated(), ['p:N1'], 'stimulations ')?.id).toBe('s');
    expect(lineNamed(stimulated(), ['p:B1'], 'Stimulations')).toBeUndefined();
    expect(lineNamed(stimulated(), ['p:N1'], '')).toBeUndefined();
  });

  it('starts empty wells on a line of their own, and filled wells on their first line', () => {
    const card = stimulated();
    expect(startingLineId(card, ['p:A1'])).toBeUndefined();
    expect(startingLineId(card, ['p:N1'])).toBe('n');
  });
});
