import { normalizeVesselMap, type VesselMapBlock } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';

import {
  lineUnitOf,
  removeSeries,
  seriesFormFor,
  seriesPreview,
  seriesSteps,
  writeSeries,
} from './seriesEdits';
import { sheetOf, vesselTabs } from './vesselTabs';

const vesselMap = () =>
  ({
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Drug X' }] }],
    cells: {},
    series: {},
    counts: {},
    amountNames: {},
  }) as unknown as VesselMapBlock;

const sheetFor = (block: VesselMapBlock) => sheetOf(block, vesselTabs(block)[0]);
const rowB = new Set(['p:B2', 'p:B3', 'p:B4']);
const form = seriesFormFor('drug', undefined, undefined, { amount: '10', unit: 'µM' });

describe('series edits', () => {
  it('number the wells along the chosen direction', () => {
    const sheet = sheetFor(vesselMap());
    expect([...seriesSteps(sheet, [...rowB], 'right')]).toEqual([
      ['p:B2', 0],
      ['p:B3', 1],
      ['p:B4', 2],
    ]);
    expect(seriesSteps(sheet, [...rowB], 'left').get('p:B2')).toBe(2);
  });

  it('start from the amount already typed in the wells', () => {
    expect(form).toMatchObject({ start: '10', unit: 'µM', fold: '', isList: false });
  });

  it('write each well a step and keep the Dilutions settings when rewritten', () => {
    const block = vesselMap();
    const sheet = sheetFor(block);
    block.cells['p:B2'] = { drug: { valueId: 'x', amount: '10' } };
    const seriesId = writeSeries(block, sheet, rowB, { ...form, fold: '3' });
    expect(block.cells['p:B4']).toEqual({ drug: { seriesId, seriesStep: 2 } });
    expect(block.cells['p:B2']).toEqual({ drug: { valueId: 'x', seriesId, seriesStep: 0 } });
    block.series[seriesId] = { ...block.series[seriesId], prep: { volumeAdded: '20' } };
    writeSeries(block, sheet, new Set(['p:B2']), { ...form, seriesId, fold: '2' });
    expect(block.series[seriesId]).toMatchObject({ fold: '2', prep: { volumeAdded: '20' } });
    expect(block.cells['p:B4']).toEqual({ drug: { seriesId, seriesStep: 2 } });
  });

  it('remove a series from every well that held it, not just the selected ones', () => {
    const block = vesselMap();
    const seriesId = writeSeries(block, sheetFor(block), rowB, { ...form, fold: '3' });
    removeSeries(block, seriesId);
    normalizeVesselMap(block);
    expect(block.series).toEqual({});
    expect(block.cells).toEqual({});
  });

  it('preview the points, shortening long runs', () => {
    const block = vesselMap();
    const sheet = sheetFor(block);
    const row = new Set(sheet.spots.filter(spot => spot.row === 0).map(spot => spot.key));
    expect(seriesPreview(block, sheet, row, { ...form, fold: '3' }, calculateBoard([]))).toBe(
      '12 steps: 10 µM, 3.33 µM, 1.11 µM, 0.37 µM, …, 5.65E-5 µM'
    );
    expect(
      seriesPreview(
        block,
        sheet,
        rowB,
        { ...form, isList: true, points: 'High, Low' },
        calculateBoard([])
      )
    ).toBe('3 steps: High, Low, and 1 left blank');
  });

  it('default a new series to a unit already used on its line', () => {
    const block = vesselMap();
    expect(lineUnitOf(block, 'drug')).toBe('');
    writeSeries(block, sheetFor(block), rowB, { ...form, fold: '3' });
    expect(lineUnitOf(block, 'drug')).toBe('µM');
    block.cells['p:H1'] = { drug: { valueId: 'x', amount: '5', unit: 'nM' } };
    expect(lineUnitOf(block, 'drug')).toBe('nM');
  });
});
