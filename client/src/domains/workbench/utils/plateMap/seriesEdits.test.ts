import { normalizePlateMap, type PlateMap, type Protocol } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';

import { sheetOf, plateMapTabs } from './plateMapTabs';
import {
  dilutionLineOf,
  lineUnitOf,
  paintSeries,
  removeSeries,
  removeSeriesEverywhere,
  seriesFit,
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
    seriesDirections: {},
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: {},
    stainedIn: {},
  }) as unknown as PlateMap;

const sheetFor = (card: PlateMap) => sheetOf(card, plateMapTabs(card)[0]);
const rowB = new Set(['p:B2', 'p:B3', 'p:B4']);
const form = seriesFormFor('drug', undefined, undefined, 'right', {
  amount: '10',
  unit: 'µM',
});

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
    const seriesById: Protocol['series'] = {};
    const sheet = sheetFor(card);
    card.samples['p:B2'] = { drug: { valueId: 'x', amount: '10' } };
    const seriesId = writeSeries(card, seriesById, sheet, rowB, { ...form, dilutionFactor: '3' });
    expect(card.samples['p:B4']).toEqual({ drug: { seriesId, seriesPoint: 2 } });
    expect(card.samples['p:B2']).toEqual({ drug: { valueId: 'x', seriesId, seriesPoint: 0 } });
    seriesById[seriesId] = { ...seriesById[seriesId], prep: { roundTo: '10' } };
    writeSeries(card, seriesById, sheet, new Set(['p:B2']), {
      ...form,
      seriesId,
      dilutionFactor: '2',
    });
    expect(seriesById[seriesId]).toMatchObject({
      dilutionFactor: '2',
      prep: { roundTo: '10' },
    });
    expect(card.samples['p:B4']).toEqual({ drug: { seriesId, seriesPoint: 2 } });
  });

  it('clear a series from every well that held it, keeping the series itself', () => {
    const card = plateMap();
    const protocol = { plateMaps: [card], series: {} as Protocol['series'] };
    const seriesId = writeSeries(card, protocol.series, sheetFor(card), rowB, {
      ...form,
      dilutionFactor: '3',
    });
    removeSeries(card, seriesId);
    normalizePlateMap(card);
    expect(Object.keys(protocol.series)).toEqual([seriesId]);
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
    const seriesById: Protocol['series'] = {};
    expect(lineUnitOf(card, seriesById, 'drug')).toBe('');
    writeSeries(card, seriesById, sheetFor(card), rowB, { ...form, dilutionFactor: '3' });
    expect(lineUnitOf(card, seriesById, 'drug')).toBe('µM');
    card.samples['p:H1'] = { drug: { valueId: 'x', amount: '5', unit: 'nM' } };
    expect(lineUnitOf(card, seriesById, 'drug')).toBe('nM');
  });

  it('paint a series already made, keeping its counts and material, the direction on the plate', () => {
    const card = plateMap();
    const seriesById: Protocol['series'] = {
      made: { top: '10', unit: 'µM', dilutionFactor: '3', points: '3', materialId: 'drug-x' },
    };
    const picked = seriesFormFor('drug', 'made', seriesById['made'], 'down', {
      amount: '',
      unit: '',
    });
    writeSeries(card, seriesById, sheetFor(card), rowB, picked);
    expect(seriesById['made']).toMatchObject({ points: '3', materialId: 'drug-x' });
    expect(card.seriesDirections).toEqual({ made: 'down' });
    removeSeries(card, 'made');
    expect(card.seriesDirections).toEqual({});
  });

  it('paint only as many points as a series has, and say when the selection is narrower', () => {
    const card = plateMap();
    const sheet = sheetFor(card);
    const series = { top: '10', unit: 'µM', dilutionFactor: '3', points: '2' };
    const seriesById: Protocol['series'] = { made: series };
    const picked = seriesFormFor('drug', 'made', series, 'right', { amount: '', unit: '' });
    writeSeries(card, seriesById, sheet, rowB, picked);
    expect(Object.keys(card.samples).sort()).toEqual(['p:B2', 'p:B3']);
    expect(seriesFit(sheet, rowB, 'right', series)).toBeUndefined();
    expect(seriesFit(sheet, rowB, 'right', { ...series, points: '5' })).toEqual({
      planned: 5,
      fits: 3,
    });
  });

  it('paint a series already on the plate onto a second block without renumbering the first', () => {
    const card = plateMap();
    const sheet = sheetFor(card);
    const seriesById: Protocol['series'] = {};
    const seriesId = writeSeries(card, seriesById, sheet, rowB, { ...form, dilutionFactor: '3' });
    const rowD = new Set(['p:D2', 'p:D3']);
    paintSeries(card, seriesById, sheet, rowD, 'drug', seriesId, 'down');
    expect(card.samples['p:B4']).toEqual({ drug: { seriesId, seriesPoint: 2 } });
    expect(card.samples['p:D3']).toEqual({ drug: { seriesId, seriesPoint: 1 } });
    expect(card.seriesDirections).toEqual({ [seriesId]: 'right' });
    writeSeries(card, seriesById, sheet, new Set(['p:D2']), {
      ...form,
      seriesId,
      dilutionFactor: '2',
      direction: 'left',
    });
    expect(card.samples['p:D2']).toEqual({ drug: { seriesId, seriesPoint: 1 } });
    expect(card.samples['p:B2']).toEqual({ drug: { seriesId, seriesPoint: 0 } });
  });

  it("put a dilution already made on the line that holds the plate's dilutions", () => {
    const card = plateMap();
    card.lines.push({ id: 'cells', name: '', role: 'auto', values: [{ id: 'c', text: 'PBMC' }] });
    card.samples['p:A1'] = {
      cells: { valueId: 'c' },
      drug: { valueId: 'x', seriesId: 'old', seriesPoint: 0 },
    };
    const seriesById: Protocol['series'] = {
      old: { top: '10', unit: 'µM', dilutionFactor: '3' },
      made: { top: '1', unit: 'µM', dilutionFactor: '2' },
    };
    expect(dilutionLineOf(card, seriesById, 'made')).toBe('drug');
    expect(dilutionLineOf(plateMap(), seriesById, 'made')).toBeUndefined();
  });

  it('remove a dilution with its wells, leaving what else those wells hold', () => {
    const card = plateMap();
    card.lines.push({ id: 'cells', name: '', role: 'auto', values: [{ id: 'c', text: 'PBMC' }] });
    card.samples['p:A1'] = {
      cells: { valueId: 'c' },
      drug: { valueId: 'x', seriesId: 'made', seriesPoint: 0 },
    };
    card.seriesDirections = { made: 'right' };
    const protocol = {
      plateMaps: [card],
      series: { made: { top: '1', unit: 'µM', dilutionFactor: '2' } },
    } as Pick<Protocol, 'plateMaps' | 'series'>;
    removeSeriesEverywhere(protocol, ['made']);
    expect(card.samples).toEqual({ 'p:A1': { cells: { valueId: 'c' } } });
    expect(card.lines.map(line => line.id)).toEqual(['cells']);
    expect(protocol.series).toEqual({});
  });
});
