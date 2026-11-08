import { calculateBoard } from '../formulas/boardCalculation';

import { recordOnMaterial, setPrepSetting } from './dilutionEdits';
import { dilutionPrep, dilutionRuns } from './dilutionPrep';
import { stockFor } from './dilutionStock';

import type { MaterialItem, PlateSeries, Protocol } from '@odysseus/shared-schemas';

const material = (name: string, values: Record<string, string>, units: Record<string, string>) =>
  ({
    id: name,
    group: 'chem',
    type: 'Drug or inhibitor',
    name,
    shownFields: [],
    values,
    units,
    customFields: [],
    fieldLabels: {},
    isDropped: false,
  }) as MaterialItem;

function protocolWith(series: PlateSeries, materials: MaterialItem[]): Protocol {
  const cells = Object.fromEntries(
    ['A', 'B', 'C'].flatMap(row =>
      [0, 1, 2, 3].map(step => [
        `p:${row}${step + 1}`,
        { drug: { valueId: 'x', seriesId: 's', seriesStep: step } },
      ])
    )
  );
  return {
    pages: [{ id: 'page', name: 'Setup', steps: [] }],
    blocks: [
      {
        id: 'materials',
        type: 'materials',
        page: 'page',
        x: 0,
        y: 0,
        w: 12,
        h: 4,
        items: materials,
      },
      {
        id: 'map',
        type: 'plate',
        page: 'page',
        lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Drug X' }] }],
        cells,
        series: { s: series },
      },
    ],
  } as unknown as Protocol;
}

const prep = { volumeAdded: '20', wellVolume: '80' };
const doseSeries: PlateSeries = { start: '300', unit: 'nM', fold: '3', direction: 'right', prep };
const drugStock = material(
  'Drug X',
  { 'stock-concentration': '10' },
  { 'stock-concentration': 'µM' }
);
const empty = calculateBoard([]);

const prepFor = (protocol: Protocol) => dilutionPrep(dilutionRuns(protocol)[0], protocol, empty);

describe('dilution prep', () => {
  it('finds each step series on the plates with its busiest point', () => {
    const [run] = dilutionRuns(protocolWith(doseSeries, []));
    expect(run).toMatchObject({ plateId: 'map', seriesId: 's', subject: 'Drug X' });
    expect([...run.wellsPerPoint.values()]).toEqual([3, 3, 3, 3]);
  });

  it('sizes the transfers to the pipettes and makes the top point from stock', () => {
    const result = prepFor(protocolWith(doseSeries, [drugStock]));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.summary).toBe('300 nM · 1:3 · 4 points');
    expect(result.strength).toBe('4×');
    expect(result.transferText).toBe('40 µL');
    expect(result.stockText).toBe('14.4 µL');
    expect(result.stockPipette).toBe('P20');
    expect(result.points.map(({ volume, final, working }) => [volume, final, working])).toEqual([
      ['120', '300 nM', '1.2 µM'],
      ['80', '100 nM', '400 nM'],
      ['80', '33.3 nM', '133 nM'],
      ['80', '11.1 nM', '44.4 nM'],
    ]);
    expect(result.notes).toEqual([
      ['Well 1', '14.4 µL stock + 105.6 µL diluent'],
      ['Diluent total', '346 µL'],
      ['Recommended', '500 µL deep-well plate'],
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('warns when the stock needs an intermediate dilution', () => {
    const strong = material(
      'Drug X',
      { 'stock-concentration': '10' },
      { 'stock-concentration': 'mM' }
    );
    const result = prepFor(protocolWith(doseSeries, [strong]));
    expect(result.kind === 'ready' && result.warnings).toEqual([
      "0.0144 µL of stock is below a P2's range. Make an intermediate dilution first.",
    ]);
  });

  it('asks for the volumes before working anything out', () => {
    const result = prepFor(protocolWith({ ...doseSeries, prep: undefined }, [drugStock]));
    expect(result).toMatchObject({
      kind: 'problem',
      problem: 'Set the well volume and the volume added.',
    });
  });

  it('runs a 1:N series forward from undiluted stock', () => {
    const ratio: PlateSeries = { start: '100', unit: '1:N', fold: '2', direction: 'right', prep };
    const result = prepFor(protocolWith(ratio, []));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.points.map(({ final }) => final)).toEqual(['1:100', '1:200', '1:400', '1:800']);
    expect(result.points[0].working).toBe('1:25');
    expect(result.stockShown).toBe('undiluted');
  });
});

describe('stock lookup', () => {
  it('asks for a stock, then for a molecular weight in the unit that suits the material', () => {
    expect(stockFor(protocolWith(doseSeries, []), 'Drug X', 'nM', false)).toMatchObject({
      kind: 'ask',
      need: 'stock',
      issue: 'Drug X is not in Materials yet.',
    });
    const massStock = material(
      'Nivolumab',
      { 'stock-concentration': '10' },
      { 'stock-concentration': 'mg/mL' }
    );
    expect(
      stockFor(protocolWith(doseSeries, [massStock]), 'Nivolumab (BMS)', 'nM', false)
    ).toMatchObject({ kind: 'ask', need: 'weight', unit: 'kDa' });
  });

  it('crosses mass and molar through the molecular weight', () => {
    const weighed = material(
      'Nivolumab',
      { 'stock-concentration': '10', 'molecular-weight': '150' },
      { 'stock-concentration': 'mg/mL', 'molecular-weight': 'kDa' }
    );
    const stock = stockFor(protocolWith(doseSeries, [weighed]), 'Nivolumab', 'nM', false);
    expect(stock.kind === 'ready' && Math.round(stock.inSeriesUnit)).toBe(66667);
  });
});

describe('dilution edits', () => {
  it('saves prep settings onto the series and answers onto a new material', () => {
    const protocol = protocolWith(doseSeries, []);
    setPrepSetting(protocol, 'map', 's', 'extraPercent', '10');
    recordOnMaterial(protocol, 'Drug X', 'stock-concentration', '5', 'mM', name =>
      material(name, {}, {})
    );
    const plate = protocol.blocks[1];
    expect(plate.type === 'plate' && plate.series['s'].prep).toMatchObject({ extraPercent: '10' });
    const materials = protocol.blocks[0];
    expect(materials.type === 'materials' && materials.items[0]).toMatchObject({
      name: 'Drug X',
      values: { 'stock-concentration': '5' },
      units: { 'stock-concentration': 'mM' },
    });
  });
});
