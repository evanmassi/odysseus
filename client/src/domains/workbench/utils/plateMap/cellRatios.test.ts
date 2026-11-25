import { normalizePlateMap, type PlateMap } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';
import { formatRatio } from '../formulas/quantities';

import { cellCount, ratioPartner, ratioRow } from './cellRatios';
import { pointAmount, seriesSummary } from './plateSeries';
import { setRatioPartner } from './wellEdits';

const empty = calculateBoard([]);

const coCulture = (content: Partial<PlateMap> = {}) =>
  ({
    lines: [
      { id: 't', name: '', role: 'auto', values: [{ id: 'tv', text: 'T cells' }] },
      { id: 'r', name: '', role: 'auto', values: [{ id: 'rv', text: 'Raji' }] },
    ],
    samples: {
      'p:A1': {
        t: { valueId: 'tv', amount: '4:1', unit: 'N:N' },
        r: { valueId: 'rv', amount: '1e4', unit: 'cells' },
      },
      'p:A2': {
        t: { valueId: 'tv', amount: '1:2', unit: 'N:N' },
        r: { valueId: 'rv', amount: '2e4', unit: 'cells' },
      },
    },
    series: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
    ...content,
  }) as PlateMap;

const lineOf = (plateMap: PlateMap, id: string) => {
  const line = plateMap.lines.find(candidate => candidate.id === id);
  if (!line) throw new Error(`no line ${id}`);
  return line;
};

describe('formatRatio', () => {
  it('reads whole numbers on both sides of 1, and 3 significant figures otherwise', () => {
    expect([8, 4, 2, 1, 0.5, 0.25].map(formatRatio)).toEqual([
      '8:1',
      '4:1',
      '2:1',
      '1:1',
      '1:2',
      '1:4',
    ]);
    expect(formatRatio(1.5)).toBe('1.5:1');
    expect(formatRatio(0.75)).toBe('1:1.33');
  });
});

describe('a ratio series', () => {
  it('halves the ratio each point and never reads 0.5:1', () => {
    const series = { top: '8:1', unit: 'N:N', dilutionFactor: '2', direction: 'right' as const };
    expect([0, 1, 2, 3, 4, 5].map(step => pointAmount(series, step, empty).amount)).toEqual([
      '8:1',
      '4:1',
      '2:1',
      '1:1',
      '1:2',
      '1:4',
    ]);
    expect(seriesSummary(series, empty)).toBe('8:1 ÷2 →');
  });
});

describe('cells worked out from a ratio', () => {
  it('finds the only other counted cells and multiplies per well', () => {
    const plateMap = coCulture();
    const tCells = lineOf(plateMap, 't');
    expect(ratioPartner(plateMap, 'p:A1', tCells, empty)?.id).toBe('r');
    expect(cellCount(plateMap, 'p:A1', tCells, empty)).toBe(4e4);
    expect(cellCount(plateMap, 'p:A2', tCells, empty)).toBe(1e4);
    expect(cellCount(plateMap, 'p:A1', lineOf(plateMap, 'r'), empty)).toBe(1e4);
  });

  it('asks for the other cells when more than one could be meant, and uses a picked one', () => {
    const plateMap = coCulture();
    plateMap.lines.push({ id: 'k', name: '', role: 'auto', values: [{ id: 'kv', text: 'K562' }] });
    plateMap.samples['p:A1']['k'] = { valueId: 'kv', amount: '5e3', unit: 'cells' };
    const tCells = lineOf(plateMap, 't');
    expect(ratioPartner(plateMap, 'p:A1', tCells, empty)).toBeUndefined();
    setRatioPartner(plateMap, 't', 'k');
    expect(cellCount(plateMap, 'p:A1', tCells, empty)).toBe(2e4);
    setRatioPartner(plateMap, 't', '');
    expect(tCells.ratioTo).toBeUndefined();
  });

  it('sums up the editor row: choices, the automatic partner and the worked-out cells', () => {
    const plateMap = coCulture();
    const tCells = lineOf(plateMap, 't');
    expect(ratioRow(plateMap, ['p:A1'], tCells, empty)).toEqual({
      choices: [{ lineId: 'r', label: 'Raji' }],
      chosenId: '',
      autoLabel: 'Raji',
      workedOut: '= 4.00E+4 cells',
    });
    expect(ratioRow(plateMap, ['p:A1', 'p:A2'], tCells, empty)?.workedOut).toBe(
      'cells differ by well'
    );
    expect(ratioRow(plateMap, ['p:A1'], lineOf(plateMap, 'r'), empty)).toBeUndefined();
  });

  it('drops a partner that is gone and follows a partner merged into another line', () => {
    const gone = coCulture({
      lines: [
        { id: 't', name: '', role: 'auto', values: [{ id: 'tv', text: 'T cells' }], ratioTo: 'x' },
        { id: 'r', name: '', role: 'auto', values: [{ id: 'rv', text: 'Raji' }] },
      ],
    });
    normalizePlateMap(gone);
    expect(lineOf(gone, 't').ratioTo).toBeUndefined();

    const merged = coCulture();
    merged.lines.push({ id: 'r2', name: '', role: 'auto', values: [{ id: 'rv2', text: 'Raji' }] });
    merged.samples['p:A3'] = { r2: { valueId: 'rv2', amount: '1e4', unit: 'cells' } };
    lineOf(merged, 't').ratioTo = 'r2';
    normalizePlateMap(merged);
    expect(lineOf(merged, 't').ratioTo).toBe('r');
  });
});
