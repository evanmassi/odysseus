import { indicatorColorOf } from '@odysseus/shared-schemas';
import { replaceEqualDeep } from '@tanstack/react-query';
import { produce } from 'immer';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { DILUTION_FACTOR_NOTATION } from '../formulas/quantities';
import { linkPlateNames } from '../materials/renameFollowing';
import { keepRecognizedTerms } from '../terms/savedTerms';

import { materialsById } from './valueEdits';
import { valueNeeds } from './valueNeeds';
import { isCellCountSource, writeValueSource } from './valueSources';
import { buildValueTable, cellSource, type ValueCell, type ValueTableGroup } from './valueTable';

import type {
  MaterialItem,
  PlateLine,
  Protocol,
  ProtocolValues,
  PlateMap,
} from '@odysseus/shared-schemas';

const material = (
  id: string,
  name: string,
  group: string,
  type: string,
  values: Record<string, string> = {},
  units: Record<string, string> = {}
): MaterialItem => ({
  id,
  group,
  type,
  name,
  shownFields: Object.keys(values),
  values,
  units,
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe: [],
});

const MATERIALS = [
  material('m-plate', 'Assay plate', 'supplies', 'Plate'),
  material(
    'm-drug',
    'Drug X',
    'chem',
    'Drug or inhibitor',
    { 'stock-concentration': '10' },
    { 'stock-concentration': 'mM' }
  ),
  material('m-dmso', 'DMSO', 'chem', 'Solvent'),
  material('m-raji', 'Raji', 'bio', 'Cell line'),
  material('m-jurkat', 'Jurkat', 'bio', 'Cell line'),
  material('m-tcells', 'T cells', 'bio', 'Primary cells'),
];

const line = (id: string, texts: string[]): PlateLine => ({
  id,
  name: '',
  role: 'auto',
  values: texts.map(text => ({ id: text, text, color: `#${text.length}${text.length}0000` })),
});

const plateMap = (id: string, title: string, content: Partial<PlateMap>): PlateMap => ({
  id,
  title,
  plates: [{ id: 'p', labware: '96', name: '' }],
  otherLabware: [],
  lines: [],
  samples: {},
  series: {},
  counts: {},
  amountNames: {},
  stain: {},
  stainedIn: {},
  ...content,
});

const killingPlate = plateMap('map', 'Assay plate map', {
  lines: [line('drug', ['Drug X', 'DMSO', 'Targets only']), line('cells', ['Raji'])],
  samples: {
    'p:A1': {
      drug: { valueId: 'Drug X', seriesId: 's', seriesPoint: 0 },
      cells: { valueId: 'Raji' },
    },
    'p:A2': {
      drug: { valueId: 'Drug X', seriesId: 's', seriesPoint: 1 },
      cells: { valueId: 'Raji' },
    },
    'p:A3': { drug: { valueId: 'DMSO' }, cells: { valueId: 'Raji' } },
    'p:A4': { drug: { valueId: 'Targets only' }, cells: { valueId: 'Raji' } },
  },
  series: { s: { top: '10', unit: 'µM', dilutionFactor: '3', direction: 'right' } },
});

const valuesWith = (content: Partial<ProtocolValues>): ProtocolValues => ({
  items: [],
  rows: [],
  ...content,
});

const mainValues = valuesWith({
  rows: [
    { id: 'sec-raji', materialId: 'm-raji' },
    { id: 'sec-tcells', materialId: 'm-tcells' },
    { id: 'sec-drug', materialId: 'm-drug' },
    { id: 'sec-plate', materialId: 'm-plate' },
  ],
  items: [
    { id: 'raji-per', row: 'sec-raji', name: 'Per well', value: '10000', unit: 'cells' },
    { id: 'raji-vol', row: 'sec-raji', name: 'volume per well', value: '50', unit: 'µL' },
    { id: 't-vol', row: 'sec-tcells', name: 'Volume  per well', value: '100', unit: 'µL' },
    { id: 'drug-vol', row: 'sec-drug', name: 'Volume per well', value: '20', unit: 'µL' },
    { id: 'drug-stock', row: 'sec-drug', materialField: 'stock-concentration' },
  ],
});

const protocolOf = (
  plateMaps: PlateMap[],
  values: ProtocolValues,
  materials: MaterialItem[] = MATERIALS
): Protocol =>
  ({
    flowCytometryPanels: [],
    cards: [],
    plateMaps,
    materials: { items: materials, customGroups: [] },
    values,
    calculations: { items: [], materialSections: [] },
    diluent: '',
  }) as unknown as Protocol;

function tableOf(unlinked: Protocol, unsortedNames: readonly string[] = []): ValueTableGroup[] {
  const protocol = produce(unlinked, draft => {
    linkPlateNames(draft);
    keepRecognizedTerms(draft);
  });
  const board = calculateBoard(collectBoardNames(protocol));
  return buildValueTable(protocol, {
    materials: materialsById(protocol),
    board,
    needs: valueNeeds(protocol, board),
    unsortedNames,
  });
}

const tableFor = (
  plateMaps: PlateMap[],
  values: ProtocolValues,
  materials?: MaterialItem[]
): ValueTableGroup[] => tableOf(protocolOf(plateMaps, values, materials));

const groupNamed = (groups: ValueTableGroup[], label: string) =>
  groups.find(group => group.label === label)!;

const cellsByLabel = (group: ValueTableGroup, rowName: string) =>
  Object.fromEntries(
    group.rows
      .find(row => row.name === rowName)!
      .cells.map(cell => [cell.label, `${cell.value}${cell.unit ? ` ${cell.unit}` : ''}`])
  );

const isCountCell = (cell: ValueCell) => {
  const source = cellSource(cell);
  return source !== undefined && isCellCountSource(source);
};

describe('the values table', () => {
  const groups = tableFor([killingPlate], mainValues);

  it('groups rows like Materials does', () => {
    expect(groups.map(group => group.label)).toEqual([
      'Biological material',
      'Chemicals & proteins',
      'Supplies',
    ]);
  });

  it('puts every number about a material on its one row', () => {
    const chem = groupNamed(groups, 'Chemicals & proteins');
    expect(cellsByLabel(chem, 'Drug X')).toEqual({
      'Volume per well': '20 µL',
      Wells: '2',
      'Top conc.': '10 µM',
      'Dil. factor': `3 ${DILUTION_FACTOR_NOTATION}`,
      Points: '2',
      'Stock conc.': '10 mM',
    });
    expect(cellsByLabel(chem, 'DMSO')).toEqual({ Wells: '1' });
    expect(cellsByLabel(groupNamed(groups, 'Biological material'), 'Raji')).toMatchObject({
      Wells: '4',
    });
  });

  it('orders columns typed, then plate, then Materials, with Wells leading its per-well numbers', () => {
    expect(groupNamed(groups, 'Chemicals & proteins').columns.map(column => column.label)).toEqual([
      'Wells',
      'Volume per well',
      'Top conc.',
      'Dil. factor',
      'Points',
      'Stock conc.',
    ]);
  });

  it('shares a column between labels that differ only in case and spacing', () => {
    const bio = groupNamed(groups, 'Biological material');
    expect(bio.columns.map(column => column.key)).toEqual([
      'total cell conc.',
      'viability',
      'live cell conc.',
      'vol.',
      'live cells',
      'wells',
      'per well',
      'volume per well',
    ]);
  });

  it('lists plate names that are not materials under the plate', () => {
    const supplies = groupNamed(groups, 'Supplies');
    expect(supplies.rows.map(row => [row.name, row.isSubRow])).toEqual([
      ['Assay plate', false],
      ['Targets only', true],
    ]);
    expect(cellsByLabel(supplies, 'Assay plate')).toEqual({ 'Wells used': '4' });
    expect(supplies.rows[1].swatch).toMatchObject({ kind: 'fill' });
  });

  it('links plate names to materials named with a note, and to mixes', () => {
    const banded = plateMap('map', 'Assay plate map', {
      lines: [line('drug', ['Drug X', 'DMSO']), line('stim', ['STX', 'Th17 cocktail'])],
      samples: {
        'p:A1': {
          drug: { valueId: 'Drug X' },
          stim: { valueId: 'STX', amount: '10', unit: 'µg/mL' },
        },
        'p:A2': {
          drug: { valueId: 'DMSO' },
          stim: { valueId: 'Th17 cocktail', amount: '5', unit: 'µL' },
        },
      },
    });
    const withNote = [...MATERIALS, material('m-stx', 'STX (stim X description)', 'bio', 'Other')];
    const mix = valuesWith({
      rows: [...mainValues.rows, { id: 'sec-mix', mixName: 'Th17 cocktail' }],
      items: mainValues.items,
    });
    const table = tableOf(protocolOf([banded], mix, withNote));
    const bio = groupNamed(table, 'Biological material');
    const stx = bio.rows.find(row => row.name.startsWith('STX'))!;
    expect(stx.cells.map(cell => cell.label)).toContain('Final conc.');
    expect(stx.swatch).toMatchObject({ kind: 'band' });
    const mixes = groupNamed(table, 'Mixes');
    expect(cellsByLabel(mixes, 'Th17 cocktail')).toMatchObject({ 'Vol./well': '5 µL' });
  });

  it('colors a band row like the legend does, even before a color is picked', () => {
    const plain = (id: string, texts: string[]): PlateLine => ({
      id,
      name: '',
      role: 'auto',
      values: texts.map(text => ({ id: text, text })),
    });
    const banded = plateMap('map', 'Assay plate map', {
      lines: [line('drug', ['Drug X', 'DMSO']), plain('cells', ['Raji'])],
      samples: {
        'p:A1': { drug: { valueId: 'Drug X' }, cells: { valueId: 'Raji' } },
        'p:A2': { drug: { valueId: 'DMSO' } },
      },
    });
    const raji = groupNamed(tableFor([banded], mainValues), 'Biological material').rows.find(
      row => row.name === 'Raji'
    );
    expect(raji?.swatch).toEqual({
      color: indicatorColorOf(banded, banded.lines[1].values[0]),
      kind: 'band',
    });
  });

  it('draws a striped line striped, the way the legend does', () => {
    const striped = plateMap('map', 'Assay plate map', {
      lines: [line('drug', ['Drug X', 'DMSO']), { ...line('cells', ['Raji']), role: 'stripe' }],
      samples: {
        'p:A1': { drug: { valueId: 'Drug X' }, cells: { valueId: 'Raji' } },
        'p:A2': { drug: { valueId: 'DMSO' } },
      },
    });
    const raji = groupNamed(tableFor([striped], mainValues), 'Biological material').rows.find(
      row => row.name === 'Raji'
    );
    expect(raji?.swatch).toMatchObject({ kind: 'stripe' });
  });

  it('shows a recipe under its material with each final in the well, and checks a fold stock', () => {
    const cocktail = {
      ...material(
        'm-th17',
        'Th17 cocktail',
        'chem',
        'Stimulant',
        { 'stock-concentration': '4' },
        {
          'stock-concentration': 'X',
        }
      ),
      recipe: [
        { id: 'r1', materialId: 'm-il6', amount: '20', unit: 'µg/mL' },
        { id: 'r2', materialId: 'm-gone', amount: '2', unit: 'µg/mL' },
      ],
    };
    const withCocktail = [
      ...MATERIALS,
      cocktail,
      material('m-il6', 'IL-6', 'chem', 'Recombinant protein'),
    ];
    const values = valuesWith({
      rows: [{ id: 'sec-th17', materialId: 'm-th17' }],
      items: [
        { id: 'well', name: 'Well volume', value: '80', unit: 'µL' },
        { id: 'th17-vol', row: 'sec-th17', name: 'Volume per well', value: '20', unit: 'µL' },
      ],
    });
    const table = tableOf(protocolOf([], values, withCocktail));
    const chem = groupNamed(table, 'Chemicals & proteins');
    expect(chem.rows.map(row => [row.name, row.isSubRow])).toEqual([
      ['Th17 cocktail', false],
      ['IL-6', true],
      ['Removed from Materials', true],
    ]);
    expect(cellsByLabel(chem, 'Th17 cocktail')).toMatchObject({ 'Final conc.': '1×' });
    expect(cellsByLabel(chem, 'IL-6')).toEqual({
      'Mix conc.': '20 µg/mL',
      'Final conc.': '5 µg/mL',
    });
    expect(chem.columns.map(column => [column.label, column.origin])).toEqual([
      ['Volume per well', 'typed'],
      ['Mix conc.', 'materials'],
      ['Final conc.', 'worked'],
    ]);
  });

  it('puts a plate that is not in Materials under Supplies too', () => {
    const killing = { ...killingPlate, title: 'Killing plate' };
    const spare = plateMap('spare', 'Spare plate', {});
    const table = tableFor([killing, spare], mainValues);
    expect(table.map(group => group.label)).not.toContain('Plates');
    expect(groupNamed(table, 'Supplies').rows.map(row => row.name)).toEqual(
      expect.arrayContaining(['Killing plate', 'Spare plate'])
    );
  });

  it('gives each extra series of the same drug its own row under the drug', () => {
    const twins = plateMap('map', 'Assay plate map', {
      lines: [line('cells', ['Raji', 'Jurkat']), line('drug', ['Drug X'])],
      samples: {
        'p:A1': {
          cells: { valueId: 'Raji' },
          drug: { valueId: 'Drug X', seriesId: 's1', seriesPoint: 0 },
        },
        'p:B1': {
          cells: { valueId: 'Jurkat' },
          drug: { valueId: 'Drug X', seriesId: 's2', seriesPoint: 0 },
        },
      },
      series: {
        s1: { top: '10', unit: 'µM', dilutionFactor: '3', direction: 'right' },
        s2: { top: '1', unit: 'µM', dilutionFactor: '2', direction: 'right' },
      },
    });
    const chem = groupNamed(tableFor([twins], mainValues), 'Chemicals & proteins');
    expect(chem.rows.map(row => row.name)).toEqual(['Drug X', 'in Raji', 'in Jurkat']);
    expect(cellsByLabel(chem, 'in Jurkat')).toMatchObject({ 'Top conc.': '1 µM' });
  });

  it('splits a drug on two plates into a row per plate', () => {
    const plateOne = plateMap('one', 'Plate one', {
      lines: [line('drug', ['Drug X', 'DMSO'])],
      samples: { 'p:A1': { drug: { valueId: 'Drug X' } }, 'p:A2': { drug: { valueId: 'DMSO' } } },
    });
    const plateTwo = plateMap('two', 'Plate two', {
      lines: [line('drug', ['Drug X', 'DMSO'])],
      samples: {
        'p:A1': { drug: { valueId: 'Drug X' } },
        'p:A2': { drug: { valueId: 'Drug X' } },
        'p:A3': { drug: { valueId: 'DMSO' } },
      },
    });
    const chem = groupNamed(tableFor([plateOne, plateTwo], mainValues), 'Chemicals & proteins');
    expect(chem.rows.slice(0, 3).map(row => row.name)).toEqual([
      'Drug X',
      'Plate one',
      'Plate two',
    ]);
    expect(cellsByLabel(chem, 'Plate two')).toEqual({ Wells: '2' });
  });

  it('keeps every row an edit did not touch when the rebuilt table is shared with the last one', () => {
    const edited = valuesWith({
      rows: mainValues.rows,
      items: mainValues.items.map(item =>
        item.id === 'raji-per' ? { ...item, value: '20000' } : item
      ),
    });
    const shared = replaceEqualDeep(groups, tableFor([killingPlate], edited));
    const rowsBefore = new Map(groups.flatMap(group => group.rows).map(row => [row.id, row]));
    const changed = shared
      .flatMap(group => group.rows)
      .filter(row => row !== rowsBefore.get(row.id))
      .map(row => row.name);
    expect(changed).toEqual(['Raji']);
  });
});

describe('short names in the values table', () => {
  it('heads a material row with its short name and keeps the full name in its value names', () => {
    const medium = material('m-med', 'ImmunoCult™-XF T Cell Expansion Medium', 'media', 'Medium', {
      'short-name': 'ImmunoCult XF',
    });
    const values = valuesWith({
      rows: [{ id: 'sec-med', materialId: 'm-med' }],
      items: [{ id: 'med-vol', row: 'sec-med', name: 'Volume per well', value: '100', unit: 'µL' }],
    });
    const groups = tableFor([], values, [...MATERIALS, medium]);
    const [row] = groupNamed(groups, 'Media, buffers & solutions').rows;
    expect(row).toMatchObject({ name: medium.name, shownName: 'ImmunoCult XF' });
    expect(row.cells[0].fullName.startsWith(medium.name)).toBe(true);
  });
});

describe('plate names and needed values in the values table', () => {
  const tCellsWithDonors: MaterialItem = {
    ...material('m-tcells', 'T cells', 'bio', 'Primary cells'),
    donors: {
      label: 'Donors',
      shownFields: [],
      customFields: [],
      rows: [
        { id: 'd1', name: 'D3128', values: {}, units: {} },
        { id: 'd2', name: 'D2044', values: {}, units: {} },
      ],
    },
  };
  const donorPlate = plateMap('map', 'Assay plate map', {
    lines: [line('cells', ['D3128', 'D2044', 'Mystery'])],
    samples: {
      'p:A1': { cells: { valueId: 'D3128', amount: '1e5', unit: 'cells' } },
      'p:A2': { cells: { valueId: 'D2044', amount: '1e5', unit: 'cells' } },
      'p:A3': { cells: { valueId: 'Mystery' } },
    },
  });
  const donorProtocol = (values: ProtocolValues) =>
    protocolOf([donorPlate], values, [
      ...MATERIALS.filter(item => item.id !== 'm-tcells'),
      tCellsWithDonors,
    ]);
  const noValues = valuesWith({});
  const rowNamed = (groups: ValueTableGroup[], label: string, name: string) =>
    groupNamed(groups, label).rows.find(row => row.name === name)!;

  it("files a donor's wells under its cell material, in the donor's color", () => {
    const table = tableOf(donorProtocol(noValues));
    const bio = groupNamed(table, 'Biological material');
    expect(bio.rows.map(row => [row.name, row.isSubRow])).toEqual(
      expect.arrayContaining([
        ['T cells', false],
        ['D3128', true],
        ['D2044', true],
      ])
    );
    expect(rowNamed(table, 'Biological material', 'D3128').swatch).toBeDefined();
    const supplyRows = groupNamed(table, 'Supplies').rows.map(row => row.name);
    expect(supplyRows).not.toContain('D3128');
  });

  it('leaves a name still waiting in "From your plate" out of the table', () => {
    const supplyRows = (unsorted: string[]) =>
      groupNamed(tableOf(donorProtocol(noValues), unsorted), 'Supplies').rows.map(row => row.name);
    expect(supplyRows([])).toContain('Mystery');
    expect(supplyRows(['Mystery'])).not.toContain('Mystery');
  });

  it('offers the volume the cell math needs on the cell row', () => {
    const table = tableOf(donorProtocol(noValues));
    const needed = rowNamed(table, 'Biological material', 'T cells').cells.find(
      cell => cell.label === 'Vol./well'
    );
    expect(needed).toMatchObject({ value: '', linkedTo: { kind: 'need' } });
    expect(needed?.neededFor).toEqual(['Cells to prepare for D3128', 'Cells to prepare for D2044']);
  });

  it('marks a blank value that the math is waiting on', () => {
    const values = valuesWith({
      rows: [{ id: 'sec-tcells', materialId: 'm-tcells' }],
      items: [{ id: 't-vol', row: 'sec-tcells', name: 'Volume per well', value: '', unit: 'µL' }],
    });
    const table = tableOf(donorProtocol(values));
    const cell = rowNamed(table, 'Biological material', 'T cells').cells.find(
      candidate => candidate.label === 'Volume per well'
    );
    expect(cell?.linkedTo).toEqual({ kind: 'saved', source: { kind: 'item', itemId: 't-vol' } });
    expect(cell?.neededFor.length).toBeGreaterThan(0);
  });
});

describe('cells on the values table', () => {
  const tCells = (rows: Array<{ id: string; name: string; values: Record<string, string> }>) => ({
    ...material('m-tcells', 'T cells', 'bio', 'Primary cells'),
    donors: {
      label: 'Donors',
      shownFields: [],
      customFields: [],
      rows: rows.map(row => ({ ...row, units: {} })),
    },
  });
  const cellPlate = plateMap('map', 'Assay plate map', {
    lines: [line('cells', ['Raji', 'D1', 'D2', 'GFP lentivirus'])],
    samples: {
      'p:A1': { cells: { valueId: 'Raji', amount: '1e4', unit: 'cells' } },
      'p:A2': { cells: { valueId: 'D1', amount: '1e5', unit: 'cells' } },
      'p:A3': { cells: { valueId: 'D2', amount: '1e5', unit: 'cells' } },
      'p:A4': { cells: { valueId: 'GFP lentivirus', amount: '5', unit: 'µL' } },
    },
  });
  const plating = valuesWith({
    rows: [{ id: 'sec-tcells', materialId: 'm-tcells' }],
    items: [{ id: 't-vol', row: 'sec-tcells', name: 'Vol./well', value: '100', unit: 'µL' }],
  });
  const cellTable = (items: MaterialItem[], plate = cellPlate) =>
    groupNamed(tableOf(protocolOf([plate], plating, items)), 'Biological material');
  const rowOf = (group: ValueTableGroup, name: string) =>
    group.rows.find(row => row.name === name)!;
  const cellOf = (group: ValueTableGroup, name: string, label: string) =>
    rowOf(group, name).cells.find(cell => cell.label === label);
  const donors = tCells([
    { id: 'd1', name: 'D1', values: { 'live-cells': '9e6' } },
    { id: 'd2', name: 'D2', values: {} },
    { id: 'd3', name: 'D3', values: { viability: '80' } },
  ]);

  it('puts the counts first on a cell row and works out the blanks', () => {
    const bio = cellTable([
      material('m-raji', 'Raji', 'bio', 'Cell line', { 'total-cell-conc': '2e6', viability: '90' }),
    ]);
    expect(bio.columns.slice(0, 5).map(column => column.label)).toEqual([
      'Total cell conc.',
      'Viability',
      'Live cell conc.',
      'Vol.',
      'Live cells',
    ]);
    expect(cellOf(bio, 'Raji', 'Total cell conc.')).toMatchObject({
      value: '2e6',
      unit: 'cells/mL',
    });
    expect(cellOf(bio, 'Raji', 'Live cell conc.')).toMatchObject({
      value: '',
      workedValue: '1.80E+6',
      isEditable: true,
      note: 'Worked out: Total cell conc. × Viability = 2.00E+6 cells/mL × 90%',
      linkedTo: {
        kind: 'saved',
        source: { kind: 'material', materialId: 'm-raji', field: { key: 'live-cell-conc' } },
      },
    });
    expect(cellOf(bio, 'Raji', 'Vol.')?.workedValue).toBeUndefined();
  });

  it('flags typed counts that disagree', () => {
    const bio = cellTable([
      material('m-raji', 'Raji', 'bio', 'Cell line', {
        'total-cell-conc': '2e6',
        viability: '90',
        'live-cell-conc': '5e5',
      }),
    ]);
    expect(cellOf(bio, 'Raji', 'Live cell conc.')).toMatchObject({
      isMismatched: true,
      note: 'Live cell conc. ≠ Total cell conc. × Viability, which gives 1.80E+6 cells/mL',
    });
  });

  it('lists every donor under its material with its own counts, plated or not', () => {
    const bio = cellTable([donors]);
    expect(bio.rows.map(row => [row.name, row.isSubRow])).toEqual([
      ['T cells', false],
      ['D1', true],
      ['D2', true],
      ['D3', true],
    ]);
    expect(rowOf(bio, 'T cells').cells.some(isCountCell)).toBe(false);
    expect(cellOf(bio, 'D1', 'Live cells')?.value).toBe('9e6');
    expect(cellOf(bio, 'D3', 'Viability')?.value).toBe('80');
  });

  it('marks the count a plated subject is missing', () => {
    const bio = cellTable([donors]);
    expect(cellOf(bio, 'D2', 'Live cells')?.neededFor).toEqual(['Cells to prepare for D2']);
    expect(cellOf(bio, 'D1', 'Live cells')?.neededFor).toEqual([]);
  });

  it('shows a plated donor its wells once and the vol./well it shares with its material', () => {
    const bio = cellTable([donors]);
    expect(rowOf(bio, 'D1').cells.filter(cell => cell.label === 'Wells')).toHaveLength(1);
    expect(cellOf(bio, 'D1', 'Wells')?.value).toBe('1');
    expect(cellOf(bio, 'D1', 'Vol./well')).toMatchObject({
      value: '',
      workedValue: '100',
      unit: 'µL',
      isEditable: false,
      note: 'Set on the T cells row',
    });
    expect(cellOf(bio, 'D3', 'Vol./well')).toBeUndefined();
  });

  it('gives a donor in wells and tubes a count per container, each beside its own numbers', () => {
    const mixed = plateMap('map', 'Plates & tubes', {
      otherLabware: [{ id: 't', labware: 'facs', count: 1 }],
      lines: [line('cells', ['D1'])],
      samples: {
        'p:A1': { cells: { valueId: 'D1', amount: '1e5', unit: 'cells' } },
        'p:A2': { cells: { valueId: 'D1', amount: '1e5', unit: 'cells' } },
        't#1:1': { cells: { valueId: 'D1', amount: '5e5', unit: 'cells' } },
      },
    });
    const withTubes = produce(plating, draft => {
      draft.items.push({
        id: 't-tube',
        row: 'sec-tcells',
        name: 'Vol./tube',
        value: '1',
        unit: 'mL',
      });
    });
    const bio = groupNamed(
      tableOf(protocolOf([mixed], withTubes, [donors])),
      'Biological material'
    );
    expect(bio.columns.slice(5).map(column => column.label)).toEqual([
      'Wells',
      'Vol./well',
      'Cells/well',
      'Tubes',
      'Vol./tube',
      'Cells/tube',
    ]);
    expect(cellOf(bio, 'D1', 'Wells')?.value).toBe('2');
    expect(cellOf(bio, 'D1', 'Tubes')?.value).toBe('1');
    expect(cellOf(bio, 'D1', 'Vol./tube')).toMatchObject({ workedValue: '1', unit: 'mL' });
    expect(cellOf(bio, 'D1', 'Samples')).toBeUndefined();
  });

  it('counts the wells of donors on a striped line, which the plate does not count', () => {
    const striped = plateMap('map', 'Assay plate map', {
      lines: [
        { ...line('stim', ['Stim']), role: 'fill' },
        { ...line('donors', ['D1', 'D2']), role: 'stripe' },
      ],
      samples: {
        'p:A1': {
          stim: { valueId: 'Stim' },
          donors: { valueId: 'D1', amount: '1e5', unit: 'cells' },
        },
        'p:A2': {
          stim: { valueId: 'Stim' },
          donors: { valueId: 'D1', amount: '1e5', unit: 'cells' },
        },
        'p:A3': {
          stim: { valueId: 'Stim' },
          donors: { valueId: 'D2', amount: '1e5', unit: 'cells' },
        },
      },
    });
    const bio = cellTable([donors], striped);
    expect(rowOf(bio, 'D1').cells.filter(cell => cell.label === 'Wells')).toHaveLength(1);
    expect(cellOf(bio, 'D1', 'Wells')).toMatchObject({ value: '2', isEditable: false });
    expect(cellOf(bio, 'D2', 'Wells')?.value).toBe('1');
  });

  it('gives a material that is not cells no counts', () => {
    const bio = cellTable([material('m-lenti', 'GFP lentivirus', 'bio', 'Virus or vector')]);
    expect(rowOf(bio, 'GFP lentivirus').cells.some(isCountCell)).toBe(false);
  });

  it('writes a typed count back to the donor in Materials', () => {
    const protocol = protocolOf([cellPlate], plating, [donors]);
    const cell = cellOf(groupNamed(tableOf(protocol), 'Biological material'), 'D2', 'Vol.');
    const written = produce(protocol, draft => {
      const source = cell && cellSource(cell);
      if (source) writeValueSource(draft, source, '2');
    });
    const [item] = written.materials.items;
    expect(item.donors?.rows[1].values['volume']).toBe('2');
    expect(item.donors?.shownFields).toContain('volume');
  });
});
