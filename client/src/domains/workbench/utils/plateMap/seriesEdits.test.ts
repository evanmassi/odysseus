import { normalizePlateMap, type PlateMap } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';

import { sheetOf, plateMapTabs } from './plateMapTabs';
import {
  lineUnitOf,
  removeSeries,
  seriesFormFor,
  seriesPreview,
  wellPoints,
  writeSeries,
} from './seriesEdits';

const plateMap = () =>
  ({
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Drug X' }] }],
    samples: {},
    series: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
  }) as unknown as PlateMap;

const sheetFor = (card: PlateMap) => sheetOf(card, plateMapTabs(card)[0]);
const rowB = new Set(['p:B2', 'p:B3', 'p:B4']);
const form = seriesFormFor('drug', undefined, undefined, { amount: '10', unit: 'µM' });

describe('series edits', () => {
  it('number the wells along the chosen direction', () => {
    const sheet = sheetFor(plateMap());
    expect([...wellPoints(sheet, [...rowB], 'right')]).toEqual([
      ['p:B2', 0],
      ['p:B3', 1],
      ['p:B4', 2],
    ]);
    expect(wellPoints(sheet, [...rowB], 'left').get('p:B2')).toBe(2);
  });

  it('takes the top from the amount already typed in the wells', () => {
    expect(form).toMatchObject({ top: '10', unit: 'µM', dilutionFactor: '', isList: false });
  });

  it('write each well its point and keep the Dilutions settings when rewritten', () => {
    const card = plateMap();
    const sheet = sheetFor(card);
    card.samples['p:B2'] = { drug: { valueId: 'x', amount: '10' } };
    const seriesId = writeSeries(card, sheet, rowB, { ...form, dilutionFactor: '3' });
    expect(card.samples['p:B4']).toEqual({ drug: { seriesId, seriesPoint: 2 } });
    expect(card.samples['p:B2']).toEqual({ drug: { valueId: 'x', seriesId, seriesPoint: 0 } });
    card.series[seriesId] = { ...card.series[seriesId], prep: { roundTo: '10' } };
    writeSeries(card, sheet, new Set(['p:B2']), { ...form, seriesId, dilutionFactor: '2' });
    expect(card.series[seriesId]).toMatchObject({
      dilutionFactor: '2',
      prep: { roundTo: '10' },
    });
    expect(card.samples['p:B4']).toEqual({ drug: { seriesId, seriesPoint: 2 } });
  });

  it('remove a series from every well that held it, not just the selected ones', () => {
    const card = plateMap();
    const seriesId = writeSeries(card, sheetFor(card), rowB, { ...form, dilutionFactor: '3' });
    removeSeries(card, seriesId);
    normalizePlateMap(card);
    expect(card.series).toEqual({});
    expect(card.samples).toEqual({});
  });

  it('preview the points, shortening long runs', () => {
    const card = plateMap();
    const sheet = sheetFor(card);
    const row = new Set(
      sheet.positions.filter(position => position.row === 0).map(position => position.key)
    );
    expect(
      seriesPreview(card, sheet, row, { ...form, dilutionFactor: '3' }, calculateBoard([]))
    ).toBe('12 points: 10 µM, 3.33 µM, 1.11 µM, 0.37 µM, …, 5.65E-5 µM');
    expect(
      seriesPreview(
        card,
        sheet,
        rowB,
        { ...form, isList: true, typedValues: 'High, Low' },
        calculateBoard([])
      )
    ).toBe('3 points: High, Low, and 1 left blank');
  });

  it('default a new series to a unit already used on its line', () => {
    const card = plateMap();
    expect(lineUnitOf(card, 'drug')).toBe('');
    writeSeries(card, sheetFor(card), rowB, { ...form, dilutionFactor: '3' });
    expect(lineUnitOf(card, 'drug')).toBe('µM');
    card.samples['p:H1'] = { drug: { valueId: 'x', amount: '5', unit: 'nM' } };
    expect(lineUnitOf(card, 'drug')).toBe('nM');
  });
});
