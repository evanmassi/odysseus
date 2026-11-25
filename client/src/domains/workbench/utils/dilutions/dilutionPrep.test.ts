import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { diluentUses, runDiluents } from './dilutionDiluents';
import { recordOnMaterial, setPrepSetting, setSharedPrepValue } from './dilutionEdits';
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
    isSetAside: false,
    recipe: [],
  }) as MaterialItem;

type ValueLine = { name: string; value: string; unit: string };

const SHARED_PREP: ValueLine[] = [
  { name: 'Total well vol.', value: '80', unit: 'µL' },
  { name: 'Drug X vol./well', value: '20', unit: 'µL' },
  { name: 'Drug X extra (dead vol.)', value: '20', unit: '%' },
];

function protocolWith(
  series: PlateSeries,
  materials: MaterialItem[],
  values: ValueLine[] = SHARED_PREP
): Protocol {
  const cells = Object.fromEntries(
    ['A', 'B', 'C'].flatMap(row =>
      [0, 1, 2, 3].map(step => [
        `p:${row}${step + 1}`,
        { drug: { valueId: 'x', seriesId: 's', seriesPoint: step } },
      ])
    )
  );
  return {
    pages: [{ id: 'page', name: 'Setup', steps: [] }],
    materials: { items: materials, customGroups: [] },
    values: { items: values.map((line, index) => ({ id: `v${index}`, ...line })), rows: [] },
    calculations: { items: [], materialSections: [] },
    cards: [
      {
        id: 'materials',
        type: 'materials',
        page: 'page',
        x: 0,
        y: 0,
        w: 12,
        h: 4,
        foldedGroups: [],
      },
      {
        id: 'map',
        type: 'plateMap',
        page: 'page',
        title: 'Assay plate',
        plates: [{ id: 'p', labware: '96', name: '' }],
        lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Drug X' }] }],
        samples: cells,
        series: { s: series },
        otherLabware: [],
        counts: {},
        amountNames: {},
        side: 'assay',
        stain: {},
        stainedIn: {},
      },
      {
        id: 'values',
        type: 'values',
        page: 'page',
        x: 0,
        y: 4,
        w: 6,
        h: 6,
      },
    ],
    diluent: '',
  } as unknown as Protocol;
}

const doseSeries: PlateSeries = {
  top: '300',
  unit: 'nM',
  dilutionFactor: '3',
  direction: 'right',
};
const withDiluent = (diluent: string): PlateSeries => ({ ...doseSeries, prep: { diluent } });
const valuesOf = (protocol: Protocol) => protocol.values.items;
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
    const [plateMap] = protocol.cards.filter(card => card.type === 'plateMap');
    const copy = structuredClone(plateMap);
    if (copy.type !== 'plateMap') return;
    copy.id = 'copy';
    copy.title = 'Assay plate copy';
    copy.series = { other: copy.series['s'] };
    for (const lines of Object.values(copy.samples)) lines['drug'].seriesId = 'other';
    protocol.cards.push(copy);
    const runs = dilutionRuns(protocol);
    expect(runs).toHaveLength(1);
    expect(runs[0].members.map(member => member.plateId)).toEqual(['map', 'copy']);
    expect(runs[0].places).toEqual(['Assay plate · Plate 1', 'Assay plate copy · Plate 1']);
    expect(runs[0].replicatesByPoint.get(0)).toBe(6);
    expect(dilutionRuns(protocol)[0].replicatesByPoint.get(0)).toBe(6);
    expect(dilutionRuns({ cards: [plateMap] })[0].places).toEqual(['Plate 1']);
  });

  it('finds each dilution series on the plates with its most replicated point', () => {
    const [run] = dilutionRuns(protocolWith(doseSeries, []));
    expect(run).toMatchObject({ members: [{ plateId: 'map', seriesId: 's' }], subject: 'Drug X' });
    expect([...run.replicatesByPoint.values()]).toEqual([3, 3, 3, 3]);
  });

  it('rounds volumes to the pipettes without naming them and makes the top point from stock', () => {
    const result = prepFor(protocolWith(doseSeries, [drugStock]));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.summary).toBe('300 nM · 1:3 · 4 points');
    expect(result.strength).toBe('4×');
    expect(result.transferText).toBe('40 µL');
    expect(result.stockText).toBe('14.4 µL');
    expect(
      result.points.map(({ volume, final, workingConc }) => [volume, final, workingConc])
    ).toEqual([
      ['120', '300 nM', '1.2 µM'],
      ['80', '100 nM', '400 nM'],
      ['80', '33.3 nM', '133 nM'],
      ['80', '11.1 nM', '44.4 nM'],
    ]);
    expect(result.points.map(({ level }) => level.toFixed(3))).toEqual([
      '0.667',
      '0.667',
      '0.667',
      '1.000',
    ]);
    expect(result.notes).toEqual([
      ['Top', '120 µL (14.4 µL stock + 105.6 µL RPMI)'],
      ['Then 2–4', '80 µL RPMI each'],
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
      ['Top', '120 µL (14.4 µL stock + 105.6 µL ImmunoCult XF)'],
      ['Then 2–4', '80 µL ImmunoCult XF each'],
      ['ImmunoCult XF total', '346 µL'],
    ];
    expect(notesFor(medium.name)).toEqual(expected);
    expect(notesFor('immunocult xf')).toEqual(expected);
    medium.shownFields = [];
    expect(notesFor(medium.name)[1]).toEqual(['Then 2–4', `80 µL ${medium.name} each`]);
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

  it('asks for the shared volumes before working anything out', () => {
    expect(prepFor(protocolWith(doseSeries, [drugStock], []))).toMatchObject({
      kind: 'problem',
      problem: 'Set the vol./well here, or as "Drug X vol./well" in Values.',
    });
    expect(prepFor(protocolWith(doseSeries, [drugStock], SHARED_PREP.slice(1)))).toMatchObject({
      kind: 'problem',
      problem: 'Set the total well vol. here, or as "Total well vol." in Values.',
    });
  });

  it("reads the total well vol. from Assay setup only, never a drug's own", () => {
    const shared = prepFor(protocolWith(doseSeries, [drugStock]));
    const own = prepFor(
      protocolWith(
        doseSeries,
        [drugStock],
        [...SHARED_PREP, { name: 'Drug X total well vol.', value: '160', unit: 'µL' }]
      )
    );
    if (shared.kind !== 'ready' || own.kind !== 'ready') throw new Error('not ready');
    expect(shared.shared.totalWellVolume).toMatchObject({ value: '80', isAssaySetup: true });
    expect(shared.shared.volumePerWell).toMatchObject({
      value: '20',
      unit: 'µL',
      isAssaySetup: false,
      edit: { kind: 'source', source: { kind: 'item', itemId: 'v1' } },
    });
    expect(own.shared.totalWellVolume).toMatchObject({ value: '80', isAssaySetup: true });
    expect(shared.strength).toBe('4×');
    expect(own.strength).toBe('4×');
  });

  it('makes exactly enough when no extra is set anywhere', () => {
    const protocol = protocolWith(doseSeries, [drugStock], SHARED_PREP.slice(0, 2));
    const board = calculateBoard(collectBoardNames(protocol));
    expect(board.names.get('drug x vol. needed')).toMatchObject({
      formula: 'Drug X replicates × Drug X vol./well',
    });
    expect(prepFor(protocol).shared.extra).toMatchObject({ value: '', edit: { kind: 'new' } });
  });

  it('marks the missing vol./well as needed in Values', () => {
    const board = calculateBoard(collectBoardNames(protocolWith(doseSeries, [drugStock], [])));
    const strength = board.names.get('drug x working strength');
    const result = strength && board.results.get(strength.id);
    expect(result).toMatchObject({ status: 'error', missingName: 'Drug X vol./well' });
  });

  it('runs a 1:N series forward from undiluted stock', () => {
    const ratio: PlateSeries = {
      top: '100',
      unit: '1:N',
      dilutionFactor: '2',
      direction: 'right',
    };
    const result = prepFor(protocolWith(ratio, []));
    if (result.kind !== 'ready') throw new Error(result.problem);
    expect(result.points.map(({ final }) => final)).toEqual(['1:100', '1:200', '1:400', '1:800']);
    expect(result.points[0].workingConc).toBe('1:25');
    expect(result.stockShown).toBe('undiluted');
  });
});

describe('diluents', () => {
  const medium = { ...material('RPMI', {}, {}), group: 'media', type: 'Medium' };

  it('totals the diluent a series needs and shows it on the material', () => {
    const protocol = protocolWith(withDiluent('RPMI'), [drugStock, medium]);
    const board = calculateBoard(collectBoardNames(protocol));
    const need = board.names.get('total rpmi needed');
    expect(need).toMatchObject({ kind: 'calculation', formula: 'Drug X diluent total' });
    const result = need && board.results.get(need.id);
    expect(result?.status === 'ok' && result.output).toEqual({ text: '346 µL' });
    expect(diluentUses(protocol, board)).toEqual([{ materialId: 'RPMI', need: '346 µL' }]);
  });

  it("totals the protocol's diluent for a series that has none of its own", () => {
    const protocol = { ...protocolWith(doseSeries, [drugStock, medium]), diluent: 'RPMI' };
    const board = calculateBoard(collectBoardNames(protocol));
    expect(diluentUses(protocol, board)).toEqual([{ materialId: 'RPMI', need: '346 µL' }]);
  });

  it("gives a series its own diluent, or the protocol's when it has none or it was cleared", () => {
    const runs = (diluents: Array<string | undefined>) =>
      diluents.map((diluent, index) => ({
        key: String(index),
        series: diluent === undefined ? doseSeries : withDiluent(diluent),
      })) as unknown as DilutionRun[];
    const chosen = runs([undefined, 'PBS', '', ' ']);
    expect([...runDiluents(chosen, 'RPMI').values()]).toEqual(['RPMI', 'PBS', 'RPMI', 'RPMI']);
    expect([...runDiluents(chosen, '').values()]).toEqual(['', 'PBS', '', '']);
  });
});

describe('dilution prep as calculations', () => {
  it('writes each prep line as a read-only calculation with its working', () => {
    const protocol = protocolWith(doseSeries, [drugStock]);
    const board = calculateBoard(collectBoardNames(protocol));
    const stock = board.names.get('drug x stock to take');
    expect(stock).toMatchObject({
      kind: 'calculation',
      formula: 'Drug X top vol. × Drug X top working conc. ÷ Drug X stock conc.',
      workedOut: { key: 'map:s', subject: 'Drug X' },
    });
    const result = stock && board.results.get(stock.id);
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
    const protocol = protocolWith(
      doseSeries,
      [drugStock],
      [...SHARED_PREP, { name: 'Drug X round to', value: '50', unit: 'µL' }]
    );
    expect(prepFor(protocol)).toMatchObject({
      kind: 'problem',
      problem: 'Rename "Drug X round to": the Drug X dilution prep needs that name.',
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
  it('saves Round to onto the series and answers onto a new material', () => {
    const protocol = protocolWith(doseSeries, []);
    setPrepSetting(protocol, 'map', 's', 'roundTo', '10');
    recordOnMaterial(protocol, 'Drug X', 'stock-concentration', '5', 'mM', name =>
      material(name, {}, {})
    );
    const plateMap = protocol.cards[1];
    expect(plateMap.type === 'plateMap' && plateMap.series['s'].prep).toEqual({ roundTo: '10' });
    expect(protocol.materials.items[0]).toMatchObject({
      name: 'Drug X',
      values: { 'stock-concentration': '5' },
      units: { 'stock-concentration': 'mM' },
    });
  });

  it('edits the shared number in Values, or adds it where the math looks', () => {
    const protocol = protocolWith(doseSeries, [drugStock], SHARED_PREP.slice(0, 1));
    const before = prepFor(protocol);
    setSharedPrepValue(protocol, 'Drug X', before.shared.totalWellVolume, '100', 'page');
    setSharedPrepValue(protocol, 'Drug X', before.shared.volumePerWell, '25', 'page');
    setSharedPrepValue(protocol, 'Drug X', before.shared.extra, '', 'page');
    const { values } = protocol;
    expect(values.rows).toEqual([{ id: expect.any(String), materialId: 'Drug X' }]);
    expect(values.items).toEqual([
      { id: 'v0', name: 'Total well vol.', value: '100', unit: 'µL' },
      {
        id: expect.any(String),
        name: 'Vol./well',
        value: '25',
        unit: 'µL',
        row: values.rows[0].id,
      },
    ]);
    const after = prepFor(protocol);
    expect(after.kind === 'ready' && after.strength).toBe('4×');
  });

  it('adds the total well vol. under Assay setup, making a Values card if there is none', () => {
    const protocol = protocolWith(doseSeries, [drugStock], []);
    protocol.cards = protocol.cards.filter(card => card.type !== 'values');
    const { totalWellVolume } = prepFor(protocol).shared;
    setSharedPrepValue(protocol, 'Drug X', totalWellVolume, '80', 'page');
    expect(valuesOf(protocol)).toEqual([
      { id: expect.any(String), name: 'Total well vol.', value: '80', unit: 'µL' },
    ]);
  });
});
