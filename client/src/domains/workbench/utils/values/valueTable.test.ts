import { bandColorOf } from '@odysseus/shared-schemas';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { DILUTION_FACTOR_NOTATION } from '../formulas/quantities';

import { materialsById } from './valueEdits';
import { buildValueTable, type ValueTableGroup } from './valueTable';

import type {
  MaterialItem,
  PlateLine,
  Protocol,
  ValuesBlock,
  VesselMapBlock,
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
  isDropped: false,
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

const vesselMap = (id: string, title: string, content: Partial<VesselMapBlock>): VesselMapBlock =>
  ({
    id,
    type: 'plate',
    title,
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    lines: [],
    cells: {},
    series: {},
    counts: {},
    amountNames: {},
    ...content,
  }) as unknown as VesselMapBlock;

const killingPlate = vesselMap('map', 'Assay plate map', {
  lines: [line('drug', ['Drug X', 'DMSO', 'Targets only']), line('cells', ['Raji'])],
  cells: {
    'p:A1': {
      drug: { valueId: 'Drug X', seriesId: 's', seriesStep: 0 },
      cells: { valueId: 'Raji' },
    },
    'p:A2': {
      drug: { valueId: 'Drug X', seriesId: 's', seriesStep: 1 },
      cells: { valueId: 'Raji' },
    },
    'p:A3': { drug: { valueId: 'DMSO' }, cells: { valueId: 'Raji' } },
    'p:A4': { drug: { valueId: 'Targets only' }, cells: { valueId: 'Raji' } },
  },
  series: { s: { start: '10', unit: 'µM', fold: '3', direction: 'right' } },
});

const valuesBlock = (id: string, content: Partial<ValuesBlock>): ValuesBlock =>
  ({ id, type: 'values', items: [], sections: [], ...content }) as unknown as ValuesBlock;

const mainValues = valuesBlock('values', {
  sections: [
    { id: 'sec-raji', materialId: 'm-raji' },
    { id: 'sec-tcells', materialId: 'm-tcells' },
    { id: 'sec-drug', materialId: 'm-drug' },
    { id: 'sec-plate', materialId: 'm-plate' },
  ],
  items: [
    { id: 'raji-per', section: 'sec-raji', name: 'Per well', value: '10000', unit: 'cells' },
    { id: 'raji-vol', section: 'sec-raji', name: 'volume per well', value: '50', unit: 'µL' },
    { id: 't-vol', section: 'sec-tcells', name: 'Volume  per well', value: '100', unit: 'µL' },
    { id: 'drug-vol', section: 'sec-drug', name: 'Volume per well', value: '20', unit: 'µL' },
    { id: 'drug-stock', section: 'sec-drug', materialField: 'stock-concentration' },
  ],
});

function tableFor(blocks: Protocol['blocks'], valuesId = 'values'): ValueTableGroup[] {
  const protocol = {
    blocks: [{ id: 'materials', type: 'materials', items: MATERIALS }, ...blocks],
  } as unknown as Protocol;
  const block = protocol.blocks.find(candidate => candidate.id === valuesId) as ValuesBlock;
  return buildValueTable(
    protocol,
    block,
    materialsById(protocol),
    calculateBoard(collectBoardNames(protocol))
  );
}

const groupNamed = (groups: ValueTableGroup[], label: string) =>
  groups.find(group => group.label === label)!;

const cellsByLabel = (group: ValueTableGroup, rowName: string) =>
  Object.fromEntries(
    group.rows
      .find(row => row.name === rowName)!
      .cells.map(cell => [cell.label, `${cell.value}${cell.unit ? ` ${cell.unit}` : ''}`])
  );

describe('the values table', () => {
  const groups = tableFor([killingPlate, mainValues]);

  it('groups rows like Materials does', () => {
    expect(groups.map(group => group.label)).toEqual([
      'Biological Material',
      'Chemicals & Proteins',
      'Supplies',
    ]);
  });

  it('puts every number about a material on its one row', () => {
    const chem = groupNamed(groups, 'Chemicals & Proteins');
    expect(cellsByLabel(chem, 'Drug X')).toEqual({
      'Volume per well': '20 µL',
      Wells: '2',
      'Top dose': '10 µM',
      Dilution: `3 ${DILUTION_FACTOR_NOTATION}`,
      Points: '2',
      'Stock concentration': '10 mM',
    });
    expect(cellsByLabel(chem, 'DMSO')).toEqual({ Wells: '1' });
    expect(cellsByLabel(groupNamed(groups, 'Biological Material'), 'Raji')).toMatchObject({
      Wells: '4',
    });
  });

  it('orders columns typed, then plate, then Materials', () => {
    expect(groupNamed(groups, 'Chemicals & Proteins').columns.map(column => column.label)).toEqual([
      'Volume per well',
      'Wells',
      'Top dose',
      'Dilution',
      'Points',
      'Stock concentration',
    ]);
  });

  it('shares a column between labels that differ only in case and spacing', () => {
    const bio = groupNamed(groups, 'Biological Material');
    expect(bio.columns.map(column => column.key)).toEqual(['per well', 'volume per well', 'wells']);
  });

  it('lists plate names that are not materials under the plate', () => {
    const supplies = groupNamed(groups, 'Supplies');
    expect(supplies.rows.map(row => [row.name, row.isSubRow])).toEqual([
      ['Assay plate', false],
      ['Targets only', true],
    ]);
    expect(cellsByLabel(supplies, 'Assay plate')).toEqual({ 'Wells used': '4' });
    expect(supplies.rows[1].swatch).toMatchObject({ isOutline: false });
  });

  it('links plate names to materials named with a note, and to mixes', () => {
    const banded = vesselMap('map', 'Assay plate map', {
      lines: [line('drug', ['Drug X', 'DMSO']), line('stim', ['HCKA', 'Th17 cocktail'])],
      cells: {
        'p:A1': {
          drug: { valueId: 'Drug X' },
          stim: { valueId: 'HCKA', amount: '10', unit: 'µg/mL' },
        },
        'p:A2': {
          drug: { valueId: 'DMSO' },
          stim: { valueId: 'Th17 cocktail', amount: '5', unit: 'µL' },
        },
      },
    });
    const withNote = {
      id: 'materials',
      type: 'materials',
      items: [
        ...MATERIALS,
        material('m-hcka', 'HCKA (heat-killed Candida albicans)', 'bio', 'Other'),
      ],
    };
    const mix = valuesBlock('values', {
      sections: [...mainValues.sections, { id: 'sec-mix', mixName: 'Th17 cocktail' }],
      items: mainValues.items,
    });
    const protocol = { blocks: [withNote, banded, mix] } as unknown as Protocol;
    const table = buildValueTable(
      protocol,
      mix,
      materialsById(protocol),
      calculateBoard(collectBoardNames(protocol))
    );
    const bio = groupNamed(table, 'Biological Material');
    const hcka = bio.rows.find(row => row.name.startsWith('HCKA'))!;
    expect(hcka.cells.map(cell => cell.label)).toContain('Concentration');
    expect(hcka.swatch).toMatchObject({ isOutline: true });
    const mixes = groupNamed(table, 'Mixes');
    expect(cellsByLabel(mixes, 'Th17 cocktail')).toMatchObject({ 'Volume per well': '5 µL' });
  });

  it('colors a band row like the legend does, even before a color is picked', () => {
    const plain = (id: string, texts: string[]): PlateLine => ({
      id,
      name: '',
      role: 'auto',
      values: texts.map(text => ({ id: text, text })),
    });
    const banded = vesselMap('map', 'Assay plate map', {
      lines: [line('drug', ['Drug X', 'DMSO']), plain('cells', ['Raji'])],
      cells: {
        'p:A1': { drug: { valueId: 'Drug X' }, cells: { valueId: 'Raji' } },
        'p:A2': { drug: { valueId: 'DMSO' } },
      },
    });
    const raji = groupNamed(tableFor([banded, mainValues]), 'Biological Material').rows.find(
      row => row.name === 'Raji'
    );
    expect(raji?.swatch).toEqual({
      color: bandColorOf(banded, banded.lines[1].values[0]),
      isOutline: true,
    });
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
    const withCocktail = {
      id: 'materials',
      type: 'materials',
      items: [...MATERIALS, cocktail, material('m-il6', 'IL-6', 'chem', 'Recombinant protein')],
    };
    const values = valuesBlock('values', {
      sections: [{ id: 'sec-th17', materialId: 'm-th17' }],
      items: [
        { id: 'well', name: 'Well volume', value: '80', unit: 'µL' },
        { id: 'th17-vol', section: 'sec-th17', name: 'Volume per well', value: '20', unit: 'µL' },
      ],
    });
    const protocol = { blocks: [withCocktail, values] } as unknown as Protocol;
    const table = buildValueTable(
      protocol,
      values,
      materialsById(protocol),
      calculateBoard(collectBoardNames(protocol))
    );
    const chem = groupNamed(table, 'Chemicals & Proteins');
    expect(chem.rows.map(row => [row.name, row.isSubRow])).toEqual([
      ['Th17 cocktail', false],
      ['IL-6', true],
      ['No longer in Materials', true],
    ]);
    expect(cellsByLabel(chem, 'Th17 cocktail')).toMatchObject({ 'Final in the well': '1×' });
    expect(cellsByLabel(chem, 'IL-6')).toEqual({
      'In the mix': '20 µg/mL',
      'Final in the well': '5 µg/mL',
    });
    expect(chem.columns.map(column => [column.label, column.origin])).toEqual([
      ['Volume per well', 'typed'],
      ['In the mix', 'materials'],
      ['Final in the well', 'worked'],
    ]);
  });

  it('puts a plate that is not in Materials under Supplies too', () => {
    const killing = { ...killingPlate, title: 'Killing plate' };
    const spare = vesselMap('spare', 'Spare plate', {});
    const table = tableFor([killing, spare, mainValues]);
    expect(table.map(group => group.label)).not.toContain('Plates');
    expect(groupNamed(table, 'Supplies').rows.map(row => row.name)).toEqual(
      expect.arrayContaining(['Killing plate', 'Spare plate'])
    );
  });

  it('gives each extra series of the same drug its own row under the drug', () => {
    const twins = vesselMap('map', 'Assay plate map', {
      lines: [line('cells', ['Raji', 'Jurkat']), line('drug', ['Drug X'])],
      cells: {
        'p:A1': {
          cells: { valueId: 'Raji' },
          drug: { valueId: 'Drug X', seriesId: 's1', seriesStep: 0 },
        },
        'p:B1': {
          cells: { valueId: 'Jurkat' },
          drug: { valueId: 'Drug X', seriesId: 's2', seriesStep: 0 },
        },
      },
      series: {
        s1: { start: '10', unit: 'µM', fold: '3', direction: 'right' },
        s2: { start: '1', unit: 'µM', fold: '2', direction: 'right' },
      },
    });
    const chem = groupNamed(tableFor([twins, mainValues]), 'Chemicals & Proteins');
    expect(chem.rows.map(row => row.name)).toEqual(['Drug X', 'in Raji', 'in Jurkat']);
    expect(cellsByLabel(chem, 'in Jurkat')).toMatchObject({ 'Top dose': '1 µM' });
  });

  it('splits a drug on two plates into a row per plate', () => {
    const plateOne = vesselMap('one', 'Plate one', {
      lines: [line('drug', ['Drug X', 'DMSO'])],
      cells: { 'p:A1': { drug: { valueId: 'Drug X' } }, 'p:A2': { drug: { valueId: 'DMSO' } } },
    });
    const plateTwo = vesselMap('two', 'Plate two', {
      lines: [line('drug', ['Drug X', 'DMSO'])],
      cells: {
        'p:A1': { drug: { valueId: 'Drug X' } },
        'p:A2': { drug: { valueId: 'Drug X' } },
        'p:A3': { drug: { valueId: 'DMSO' } },
      },
    });
    const chem = groupNamed(tableFor([plateOne, plateTwo, mainValues]), 'Chemicals & Proteins');
    expect(chem.rows.slice(0, 3).map(row => row.name)).toEqual([
      'Drug X',
      'Plate one',
      'Plate two',
    ]);
    expect(cellsByLabel(chem, 'Plate two')).toEqual({ Wells: '2' });
  });

  it('shows rows for materials without values only in the first Values card', () => {
    const second = valuesBlock('second', {
      sections: [{ id: 'sec-jurkat', materialId: 'm-jurkat' }],
    });
    const groupsOfSecond = tableFor([killingPlate, mainValues, second], 'second');
    expect(groupsOfSecond.flatMap(group => group.rows.map(row => row.name))).toEqual(['Jurkat']);
  });
});
