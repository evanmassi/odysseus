import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { diluentUses, runDiluents } from './dilutionDiluents';
import { recordOnMaterial, setPrepSetting } from './dilutionEdits';
import { dilutionPrep } from './dilutionPrep';
import { dilutionRuns, type DilutionRun } from './dilutionRuns';
import { stockFor } from './dilutionStock';

import type { MaterialItem, PlateSeries, Protocol } from '@odysseus/shared-schemas';

const material = (name: string, values: Record<string, string>, units: Record<string, string>) =>
  ({
    id: name,
    group: 'chem',
    type: 'Drug or inhibitor',
    name,
    shownFields: Object.keys(values),
    values,
    units,
    customFields: [],
    fieldLabels: {},
    isDropped: false,
    recipe: [],
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
        foldedGroups: [],
      },
      {
        id: 'map',
        type: 'plate',
        page: 'page',
        title: 'Assay plate',
        plates: [{ id: 'p', vessel: '96', name: '' }],
        lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Drug X' }] }],
        cells,
        series: { s: series },
        sets: [],
        counts: {},
        amountNames: {},
      },
    ],
    diluent: '',
  } as unknown as Protocol;
}

const prep = { volumeAdded: '20', wellVolume: '80' };
const doseSeries: PlateSeries = { start: '300', unit: 'nM', fold: '3', direction: 'right', prep };
const drugStock = material(
  'Drug X',
  { 'stock-concentration': '10' },
  { 'stock-concentration': 'µM' }
);
const prepFor = (protocol: Protocol) =>
  dilutionPrep(
    dilutionRuns(protocol)[0],
    protocol,
    calculateBoard(collectBoardNames(protocol)),
    'RPMI'
  );

describe('dilution prep', () => {
  it('pools identical series from copied plates into one prep sized for all their wells', () => {
    const protocol = protocolWith(doseSeries, []);
    const [plate] = protocol.blocks.filter(block => block.type === 'plate');
    const copy = structuredClone(plate);
    if (copy.type !== 'plate') return;
    copy.id = 'copy';
    copy.title = 'Assay plate copy';
    copy.series = { other: copy.series['s'] };
    for (const lines of Object.values(copy.cells)) lines['drug'].seriesId = 'other';
    protocol.blocks.push(copy);
    const runs = dilutionRuns(protocol);
    expect(runs).toHaveLength(1);
    expect(runs[0].members.map(member => member.plateId)).toEqual(['map', 'copy']);
    expect(runs[0].places).toEqual(['Assay plate · Plate 1', 'Assay plate copy · Plate 1']);
    expect(runs[0].wellsPerPoint.get(0)).toBe(6);
    expect(dilutionRuns(protocol)[0].wellsPerPoint.get(0)).toBe(6);
    expect(dilutionRuns({ blocks: [plate] })[0].places).toEqual(['Plate 1']);
  });

  it('finds each step series on the plates with its busiest point', () => {
    const [run] = dilutionRuns(protocolWith(doseSeries, []));
    expect(run).toMatchObject({ members: [{ plateId: 'map', seriesId: 's' }], subject: 'Drug X' });
    expect([...run.wellsPerPoint.values()]).toEqual([3, 3, 3, 3]);
  });

  it('rounds volumes to the pipettes without naming them and makes the top point from stock', () => {
    const result = prepFor(protocolWith(doseSeries, [drugStock]));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.summary).toBe('300 nM · 1:3 · 4 points');
    expect(result.strength).toBe('4×');
    expect(result.transferText).toBe('40 µL');
    expect(result.stockText).toBe('14.4 µL');
    expect(result.points.map(({ volume, final, working }) => [volume, final, working])).toEqual([
      ['120', '300 nM', '1.2 µM'],
      ['80', '100 nM', '400 nM'],
      ['80', '33.3 nM', '133 nM'],
      ['80', '11.1 nM', '44.4 nM'],
    ]);
    expect(result.notes).toEqual([
      ['Well 1', '120 µL (14.4 µL stock + 105.6 µL RPMI)'],
      ['Wells 2–4', '80 µL RPMI each'],
      ['RPMI total', '346 µL'],
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("names the diluent in the recipe by its material's short name, typed either way", () => {
    const medium = material(
      'ImmunoCult™-XF T Cell Expansion Medium',
      { 'short-name': 'ImmunoCult XF' },
      {}
    );
    const protocol = protocolWith(doseSeries, [drugStock, medium]);
    const notesFor = (chosen: string) => {
      const result = dilutionPrep(
        dilutionRuns(protocol)[0],
        protocol,
        calculateBoard(collectBoardNames(protocol)),
        chosen
      );
      return result.kind === 'ready' ? result.notes : [];
    };
    const expected = [
      ['Well 1', '120 µL (14.4 µL stock + 105.6 µL ImmunoCult XF)'],
      ['Wells 2–4', '80 µL ImmunoCult XF each'],
      ['ImmunoCult XF total', '346 µL'],
    ];
    expect(notesFor(medium.name)).toEqual(expected);
    expect(notesFor('immunocult xf')).toEqual(expected);
    medium.shownFields = [];
    expect(notesFor(medium.name)[1]).toEqual(['Wells 2–4', `80 µL ${medium.name} each`]);
  });

  it('shows a tiny stock volume as it is, without telling the scientist what to pipette with', () => {
    const strong = material(
      'Drug X',
      { 'stock-concentration': '10' },
      { 'stock-concentration': 'mM' }
    );
    const result = prepFor(protocolWith(doseSeries, [strong]));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.stockText).toBe('0.0144 µL');
    expect(result.warnings).toEqual([]);
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

describe('diluents', () => {
  const medium = { ...material('RPMI', {}, {}), group: 'media', type: 'Medium' };

  it('totals the diluent a series needs and shows it on the material', () => {
    const protocol = protocolWith({ ...doseSeries, prep: { ...prep, diluent: 'RPMI' } }, [
      drugStock,
      medium,
    ]);
    const calculation = calculateBoard(collectBoardNames(protocol));
    const need = calculation.names.get('rpmi needed for dilutions');
    expect(need).toMatchObject({ kind: 'formula', expr: 'Drug X diluent total' });
    const result = need && calculation.results.get(need.id);
    expect(result?.status === 'ok' && result.output).toEqual({ text: '346 µL' });
    expect(diluentUses(protocol, calculation)).toEqual([{ materialId: 'RPMI', need: '346 µL' }]);
  });

  it("totals the protocol's diluent for a series that has none of its own", () => {
    const protocol = { ...protocolWith(doseSeries, [drugStock, medium]), diluent: 'RPMI' };
    const calculation = calculateBoard(collectBoardNames(protocol));
    expect(diluentUses(protocol, calculation)).toEqual([{ materialId: 'RPMI', need: '346 µL' }]);
  });

  it("gives a series its own diluent, or the protocol's when it has none or it was cleared", () => {
    const runs = (diluents: Array<string | undefined>) =>
      diluents.map((diluent, index) => ({
        key: String(index),
        series: { ...doseSeries, prep: diluent === undefined ? prep : { ...prep, diluent } },
      })) as unknown as DilutionRun[];
    const chosen = runs([undefined, 'PBS', '', ' ']);
    expect([...runDiluents(chosen, 'RPMI').values()]).toEqual(['RPMI', 'PBS', 'RPMI', 'RPMI']);
    expect([...runDiluents(chosen, '').values()]).toEqual(['', 'PBS', '', '']);
  });
});

describe('dilution prep as calculations', () => {
  it('writes each prep line as a read-only calculation with its working', () => {
    const protocol = protocolWith(doseSeries, [drugStock]);
    const calculation = calculateBoard(collectBoardNames(protocol));
    const stock = calculation.names.get('drug x stock to take');
    expect(stock).toMatchObject({
      kind: 'formula',
      expr: 'Drug X top well volume × Drug X top working ÷ Drug X stock concentration',
      workedOut: { key: 'map:s', subject: 'Drug X' },
    });
    const result = stock && calculation.results.get(stock.id);
    expect(result?.status === 'ok' && result.output).toEqual({ text: '14.4 µL' });
  });

  it('crosses mass and molar through the molecular weight', () => {
    const weighed = material(
      'Drug X',
      { 'stock-concentration': '10', 'molecular-weight': '150' },
      { 'stock-concentration': 'mg/mL', 'molecular-weight': 'kDa' }
    );
    weighed.group = 'ab';
    weighed.type = 'Antibody';
    const result = prepFor(protocolWith(doseSeries, [weighed]));
    expect(result.kind === 'ready' && result.stockText).toBe('2.16 µL');
  });

  it('stops a prep whose name is already taken, instead of reading the wrong number', () => {
    const protocol = protocolWith(doseSeries, [drugStock]);
    protocol.blocks.push({
      id: 'values',
      type: 'values',
      page: 'page',
      sections: [],
      items: [{ id: 'mine', name: 'Drug X volume added', value: '50', unit: 'µL' }],
    } as unknown as Protocol['blocks'][number]);
    expect(prepFor(protocol)).toMatchObject({
      kind: 'problem',
      problem: 'Rename “Drug X volume added”: the Drug X dilution prep needs that name.',
    });
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
