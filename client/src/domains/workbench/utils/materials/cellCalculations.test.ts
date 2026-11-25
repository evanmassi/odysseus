import { calculateBoard, type SolvedBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { nameUsage } from '../formulas/nameUsage';

import { cellWarnings } from './cellCalculations';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const pbmc = (live: Record<string, string>): MaterialItem =>
  ({
    id: 'pbmc',
    group: 'bio',
    type: 'Primary cells',
    name: 'PBMC',
    shownFields: [],
    values: {},
    units: {},
    customFields: [],
    fieldLabels: {},
    isSetAside: false,
    recipe: [],
    donors: {
      label: 'Donors',
      shownFields: [],
      customFields: [],
      rows: [
        { id: 'd1', name: 'Donor 1', values: { 'cells-per-vial': '5e6', ...live }, units: {} },
      ],
    },
  }) as MaterialItem;

function protocolWith(
  live: Record<string, string>,
  values: Array<[name: string, value: string, unit: string]>
): Protocol {
  const cells = Object.fromEntries(
    ['A1', 'A2', 'A3'].map(well => [
      `p:${well}`,
      { d: { valueId: 'v1', amount: '1e5', unit: 'cells' } },
    ])
  );
  return {
    pages: [{ id: 'page', name: 'Setup', steps: [] }],
    materials: { items: [pbmc(live)], customGroups: [] },
    values: {
      rows: [],
      items: values.map(([name, value, unit]) => ({ id: name, name, value, unit })),
    },
    calculations: { items: [], materialSections: [] },
    plateMaps: [
      {
        id: 'plate',
        title: '',
        plates: [{ id: 'p', labware: '96', name: '' }],
        otherLabware: [],
        lines: [{ id: 'd', name: 'Donors', role: 'auto', values: [{ id: 'v1', text: 'Donor 1' }] }],
        samples: cells,
        series: {},
        counts: {},
        amountNames: {},
        stain: {},
        stainedIn: {},
      },
    ],
    flowCytometryPanels: [],
    cards: [
      { id: 'materials', type: 'materials', page: 'page' },
      { id: 'plate-card', type: 'plateMap', page: 'page', shows: 'plate', side: 'assay' },
      { id: 'values', type: 'values', page: 'page' },
    ],
  } as unknown as Protocol;
}

const answer = (board: SolvedBoard, part: string) => {
  const result = board.results.get(`cells:d1:${part}`);
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
};

const calculate = (protocol: Protocol) => calculateBoard(collectBoardNames(protocol));

const PLATING: Array<[string, string, string]> = [
  ['PBMC volume per well', '100', 'µL'],
  ['PBMC extra', '10', '%'],
];

describe('cell math for a donor on the plate', () => {
  it('works out cells needed, vials, plating concentration, resuspend volume and left over', () => {
    const board = calculate(protocolWith({ 'total-cells': '1e7', viability: '90' }, PLATING));
    expect(answer(board, 'needed')).toBe('3.30E+5 cells');
    expect(answer(board, 'vials')).toBe('1');
    expect(answer(board, 'plating')).toBe('1.00E+6 cells/mL');
    expect(answer(board, 'resuspend')).toBe('9 mL');
    expect(answer(board, 'left-over')).toBe('8.67E+6 cells');
    expect(board.names.get('donor 1 wells')).toMatchObject({ kind: 'count', count: 3 });
    expect(cellWarnings(board).size).toBe(0);
  });

  it('reads the per-well volume and a whole-experiment extra under their other spellings', () => {
    const board = calculate(
      protocolWith({ 'total-cells': '1e7', viability: '90' }, [
        ['PBMC vol./well', '100', 'µL'],
        ['Extra (dead vol.)', '10', '%'],
      ])
    );
    expect(answer(board, 'needed')).toBe('3.30E+5 cells');
    expect(answer(board, 'plating')).toBe('1.00E+6 cells/mL');
  });

  it('counts a value the cell math reads as used', () => {
    const protocol = protocolWith({ 'live-cells': '1e6' }, PLATING);
    const usage = nameUsage(protocol, calculate(protocol), ['PBMC volume per well']);
    expect(usage.get('PBMC volume per well')?.calculationCount).toBe(1);
  });

  it('says what is missing, and warns when the cells fall short', () => {
    const missing = calculate(protocolWith({}, []));
    expect(answer(missing, 'needed')).toBe('3.00E+5 cells');
    expect(answer(missing, 'plating')).toMatchObject({
      status: 'error',
      message: 'Needs "Vol./well" in Values, the volume of cells added to each well',
    });
    expect(answer(missing, 'left-over')).toMatchObject({
      message: 'Needs a live count: Live cells, or Live cell conc. and Vol.',
    });

    const short = calculate(protocolWith({ 'live-cells': '2e5' }, PLATING));
    expect(cellWarnings(short)).toEqual(
      new Map([['cells:d1:left-over', ['Short by 1.30E+5 cells']]])
    );
  });

  it('steps aside for a name the scientist already uses', () => {
    const board = calculate(
      protocolWith({ 'live-cells': '1e6' }, [['Donor 1 total needed', '5', '']])
    );
    expect(answer(board, 'vials')).toMatchObject({
      message: 'Rename "Donor 1 total needed": the cell math for Donor 1 needs that name.',
    });
  });
});

describe('cell math for a donor in tubes', () => {
  const inTubes = (values: Array<[string, string, string]>): Protocol => {
    const protocol = protocolWith({ 'live-cells': '1e7' }, values);
    const [plateMap] = protocol.plateMaps;
    plateMap.plates = [];
    plateMap.otherLabware = [{ id: 't', labware: 'facs', count: 3 }];
    plateMap.samples = Object.fromEntries(
      [1, 2, 3].map(n => [`t#${n}:1`, { d: { valueId: 'v1', amount: '1e5', unit: 'cells' } }])
    );
    return protocol;
  };

  it('reads the volume per tube and names its own lines for tubes', () => {
    const board = calculate(inTubes([['PBMC vol./tube', '1', 'mL']]));
    expect(answer(board, 'needed')).toBe('3.00E+5 cells');
    expect(answer(board, 'plating')).toBe('1.00E+5 cells/mL');
    expect(board.names.get('donor 1 tubes')).toMatchObject({ kind: 'count', count: 3 });
    expect(board.names.has('donor 1 cells in the tubes')).toBe(true);
    expect(board.names.has('donor 1 wells')).toBe(false);
  });

  const inWellsAndTubes = (values: Array<[string, string, string]>): Protocol => {
    const protocol = inTubes([['PBMC volume per well', '100', 'µL'], ...values]);
    const [plateMap] = protocol.plateMaps;
    const cells = (amount: string) => ({ d: { valueId: 'v1', amount, unit: 'cells' } });
    plateMap.plates = [{ id: 'p', labware: '96', name: '' }];
    plateMap.otherLabware = [{ id: 't', labware: 'facs', count: 2 }];
    plateMap.samples = {
      ...Object.fromEntries(['A1', 'A2', 'A3'].map(well => [`p:${well}`, cells('1e5')])),
      ...Object.fromEntries([1, 2].map(n => [`t#${n}:1`, cells('5e5')])),
    };
    const [donor] = protocol.materials.items[0].donors?.rows ?? [];
    donor.values = { 'cells-per-vial': '5e6', 'live-cells': '1e7', 'live-cell-conc': '2e6' };
    return protocol;
  };

  it('thaws once for wells and tubes, then takes and resuspends each container’s cells', () => {
    const board = calculate(
      inWellsAndTubes([
        ['PBMC vol./tube', '1', 'mL'],
        ['PBMC extra', '10', '%'],
      ])
    );
    expect(answer(board, 'needed:well')).toBe('3.30E+5 cells');
    expect(answer(board, 'needed:tube')).toBe('1.10E+6 cells');
    expect(answer(board, 'needed')).toBe('1.43E+6 cells');
    expect(answer(board, 'vials')).toBe('1');
    expect(answer(board, 'plating:well')).toBe('1.00E+6 cells/mL');
    expect(answer(board, 'plating:tube')).toBe('5.00E+5 cells/mL');
    expect(answer(board, 'take:well')).toBe('165 µL');
    expect(answer(board, 'resuspend:well')).toBe('330 µL');
    expect(answer(board, 'take:tube')).toBe('550 µL');
    expect(answer(board, 'resuspend:tube')).toBe('2.2 mL');
    expect(answer(board, 'left-over')).toBe('8.57E+6 cells');
    expect(board.names.get('donor 1 tubes')).toMatchObject({ kind: 'count', count: 2 });
  });

  it('asks for the tubes’ own volume instead of borrowing the wells’', () => {
    expect(answer(calculate(inWellsAndTubes([])), 'plating:tube')).toMatchObject({
      message: 'Needs "Vol./tube" in Values, the volume of cells added to each tube',
    });
  });

  it('asks for the volume per tube in tube words', () => {
    expect(answer(calculate(inTubes([])), 'plating')).toMatchObject({
      message: 'Needs "Vol./tube" in Values, the volume of cells added to each tube',
    });
  });
});

describe('cell math for cells diluted from a stock', () => {
  const hkca = {
    id: 'hkca',
    group: 'bio',
    type: 'Microbial strain',
    name: 'Heat Killed Candida (Dectin-1 agonist)',
    shownFields: ['stock-concentration', 'short-name'],
    values: { 'stock-concentration': '1e9', 'short-name': 'HKCA' },
    units: { 'stock-concentration': 'cells/mL' },
    customFields: [],
    fieldLabels: {},
    isSetAside: false,
    recipe: [],
  } as unknown as MaterialItem;

  function stockProtocol(): Protocol {
    const base = protocolWith({}, []);
    const cells = Object.fromEntries(
      ['A1', 'A2'].map(well => [
        `p:${well}`,
        { d: { valueId: 'v1', amount: '4e4', unit: 'cells' } },
      ])
    );
    return {
      ...base,
      materials: { items: [hkca], customGroups: [] },
      values: {
        rows: [{ id: 's', materialId: 'hkca' }],
        items: [{ id: 'vol', name: 'Volume per well', value: '20', unit: 'µL', row: 's' }],
      },
      plateMaps: base.plateMaps.map(plateMap => ({
        ...plateMap,
        samples: cells,
        lines: [{ id: 'd', name: '', role: 'band', values: [{ id: 'v1', text: 'HKCA' }] }],
      })),
    } as Protocol;
  }

  const stockAnswer = (board: SolvedBoard, part: string) => {
    const result = board.results.get(`cells:hkca:${part}`);
    return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
  };

  it('reads the volume per well filed under the full name, and takes stock instead of counting', () => {
    const board = calculate(stockProtocol());
    expect(stockAnswer(board, 'needed')).toBe('8.00E+4 cells');
    expect(stockAnswer(board, 'plating')).toBe('2.00E+6 cells/mL');
    expect(stockAnswer(board, 'suspension')).toBe('40 µL');
    expect(stockAnswer(board, 'stock')).toBe('0.08 µL');
    expect(stockAnswer(board, 'diluent')).toBe('39.9 µL');
    expect(board.results.has('cells:hkca:resuspend')).toBe(false);
    expect(board.results.has('cells:hkca:left-over')).toBe(false);
  });
});

describe('cell math from the counts', () => {
  const raji = (values: Record<string, string>) =>
    ({
      id: 'raji',
      group: 'bio',
      type: 'Cell line',
      name: 'Raji',
      shownFields: [],
      values,
      units: {},
      customFields: [],
      fieldLabels: {},
      isSetAside: false,
      recipe: [],
    }) as unknown as MaterialItem;

  function cultureProtocol(values: Record<string, string>): Protocol {
    const base = protocolWith({}, []);
    const wells = ['A', 'B'].flatMap(row =>
      Array.from({ length: 12 }, (_, index) => `p:${row}${index + 1}`)
    );
    const cells = Object.fromEntries(
      wells.map(well => [well, { d: { valueId: 'v1', amount: '1e4', unit: 'cells' } }])
    );
    return {
      ...base,
      materials: { items: [raji(values)], customGroups: [] },
      values: {
        rows: [{ id: 's', materialId: 'raji' }],
        items: [
          { id: 'vol', name: 'Vol./well', value: '100', unit: 'µL', row: 's' },
          { id: 'extra', name: 'Extra (dead vol.)', value: '20', unit: '%' },
        ],
      },
      plateMaps: base.plateMaps.map(plateMap => ({
        ...plateMap,
        samples: cells,
        lines: [{ id: 'd', name: '', role: 'band', values: [{ id: 'v1', text: 'Raji' }] }],
      })),
    } as Protocol;
  }

  const rajiAnswer = (board: SolvedBoard, part: string) => {
    const result = board.results.get(`cells:raji:${part}`);
    return result?.status === 'ok' && 'text' in result.output ? result.output.text : result;
  };

  it('takes from the culture by its live cell conc., worked out from total and viability', () => {
    const board = calculate(
      cultureProtocol({ 'total-cell-conc': '2e6', viability: '90', volume: '5' })
    );
    expect(rajiAnswer(board, 'needed')).toBe('2.88E+5 cells');
    expect(rajiAnswer(board, 'stock')).toBe('160 µL');
    expect(rajiAnswer(board, 'diluent')).toBe('2.72 mL');
    expect(rajiAnswer(board, 'left-over')).toBe('8.71E+6 cells');
    expect(board.names.get('raji live cell conc.')).toMatchObject({
      kind: 'calculation',
      formula: 'Raji total cell conc. × Raji viability',
      isIntermediate: true,
      workedOut: { key: 'cells:raji:group' },
    });
  });

  it('asks for a live count when there is none', () => {
    const board = calculate(cultureProtocol({ 'total-cell-conc': '2e6' }));
    expect(rajiAnswer(board, 'stock')).toMatchObject({
      message: 'Needs a live count: Live cell conc., or Total cell conc. and Viability',
    });
    expect(board.results.has('cells:raji:left-over')).toBe(false);
  });

  it('resuspends a donor from its live cell conc. and vol.', () => {
    const board = calculate(
      protocolWith({ 'live-cell-conc': '8e5', volume: '2', 'cells-per-vial': '' }, PLATING)
    );
    expect(answer(board, 'resuspend')).toBe('1.6 mL');
    expect(answer(board, 'left-over')).toBe('1.27E+6 cells');
  });
});
