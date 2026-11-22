import { materialWellCounts, plateAmounts, plateMapCounts } from './plateMapNames';

import type { MaterialItem, PlateLine, PlateMapCard } from '@odysseus/shared-schemas';

const plateMap = (content: Partial<PlateMapCard>): PlateMapCard => ({
  id: 'map',
  type: 'plate',
  title: 'Vessel map',
  page: 'page',
  x: 0,
  y: 0,
  w: 6,
  h: 6,
  isCollapsed: false,
  plates: [{ id: 'p1', vessel: '96', name: '' }],
  sets: [],
  activeTab: 0,
  lines: [],
  cells: {},
  series: {},
  mergesReplicates: true,
  counts: {},
  amountNames: {},
  side: 'assay',
  stain: {},
  stainedIn: {},
  ...content,
});

const line = (id: string, texts: string[], role: PlateLine['role'] = 'auto'): PlateLine => ({
  id,
  name: '',
  role,
  values: texts.map(text => ({ id: text, text })),
});

describe('plate map counts', () => {
  it('counts each color value across plates and shelves, with typed counts winning', () => {
    const card = plateMap({
      sets: [{ id: 's1', vessel: 'T75', count: 2 }],
      lines: [line('drug', ['Aspirin', 'Brufen'])],
      cells: {
        'p1:A1': { drug: { valueId: 'Aspirin' } },
        'p1:A2': { drug: { valueId: 'Aspirin' } },
        's1#1:1': { drug: { valueId: 'Brufen' } },
        'p1:A3': { drug: { unit: 'µM' } },
      },
      counts: { Brufen: '4' },
    });
    expect(plateMapCounts(card).map(({ name, count }) => [name, count])).toEqual([
      ['Aspirin wells', 2],
      ['Brufen flasks', 4],
      ['Wells used', 2],
      ['Flasks used', 1],
      ['96-well plates', 1],
      ['T75 flasks', 2],
    ]);
  });
});

describe('plate amounts', () => {
  it('splits an amount that differs by color value', () => {
    const card = plateMap({
      lines: [line('drug', ['Aspirin', 'Brufen']), line('stim', ['Anti-CD3'])],
      cells: {
        'p1:A1': {
          drug: { valueId: 'Aspirin' },
          stim: { valueId: 'Anti-CD3', amount: '1', unit: 'µg/mL' },
        },
        'p1:A2': {
          drug: { valueId: 'Brufen' },
          stim: { valueId: 'Anti-CD3', amount: '2', unit: 'µg/mL' },
        },
      },
    });
    expect(plateAmounts(card).map(({ name, value }) => [name, value])).toEqual([
      ['Anti-CD3 final conc. in Aspirin', '1'],
      ['Anti-CD3 final conc. in Brufen', '2'],
    ]);
  });

  const twinSeries = (colorValues: [string, string]) =>
    plateMap({
      lines: [line('cells', ['Jurkat', 'Raji'], 'color'), line('drug', ['Drug X'])],
      cells: Object.fromEntries(
        colorValues.flatMap((cellValue, row) =>
          [0, 1].map(step => [
            `p1:${'AB'[row]}${step + 1}`,
            {
              cells: { valueId: cellValue },
              drug: { valueId: 'Drug X', seriesId: `s${row + 1}`, seriesStep: step },
            },
          ])
        )
      ),
      series: {
        s1: { start: '10', unit: 'µM', fold: '3', direction: 'right' },
        s2: { start: '30', unit: 'µM', fold: '3', direction: 'right' },
      },
    });

  it('tells twin series apart by their color value', () => {
    const names = plateAmounts(twinSeries(['Jurkat', 'Raji'])).map(({ name }) => name);
    expect(names).toContain('Drug X top conc. in Jurkat');
    expect(names).toContain('Drug X top conc. in Raji');
  });

  it('numbers twin series that share a color value', () => {
    const names = plateAmounts(twinSeries(['Jurkat', 'Jurkat'])).map(({ name }) => name);
    expect(names).toContain('Drug X top conc. 1');
    expect(names).toContain('Drug X top conc. 2');
  });
});

describe('twin series on different plates', () => {
  it('are told apart by the plate they sit on', () => {
    const card = plateMap({
      plates: [
        { id: 'p1', vessel: '96', name: '' },
        { id: 'p2', vessel: '96', name: 'Copy' },
      ],
      lines: [line('drug', ['Drug X', 'DMSO'])],
      cells: {
        'p1:A1': { drug: { valueId: 'Drug X', seriesId: 's1', seriesStep: 0 } },
        'p1:A2': { drug: { valueId: 'DMSO' } },
        'p2:A1': { drug: { valueId: 'Drug X', seriesId: 's2', seriesStep: 0 } },
      },
      series: {
        s1: { start: '10', unit: 'µM', fold: '3', direction: 'right' },
        s2: { start: '10', unit: 'µM', fold: '3', direction: 'right' },
      },
    });
    const names = plateAmounts(card).map(({ name }) => name);
    expect(names).toContain('Drug X top conc. on Plate 1');
    expect(names).toContain('Drug X top conc. on Copy');
  });
});

describe('material well counts', () => {
  it('count wells by the short name in front of a note in parentheses', () => {
    const card = plateMap({
      lines: [line('stim', ['STX', 'None'])],
      cells: {
        'p1:A1': { stim: { valueId: 'STX' } },
        'p1:A2': { stim: { valueId: 'STX' } },
        'p1:A3': { stim: { valueId: 'None' } },
      },
    });
    const stimMaterial = {
      name: 'STX (stim X description)',
      shownFields: [],
      values: {},
    } as unknown as MaterialItem;
    expect(materialWellCounts([card], [stimMaterial]).get(stimMaterial)).toBe(2);
  });

  it('count wells by the material short name', () => {
    const card = plateMap({
      lines: [line('media', ['ImmunoCult XF'])],
      cells: { 'p1:A1': { media: { valueId: 'ImmunoCult XF' } } },
    });
    const medium = {
      name: 'ImmunoCult™-XF T Cell Expansion Medium',
      shownFields: ['short-name'],
      values: { 'short-name': 'ImmunoCult XF' },
    } as unknown as MaterialItem;
    expect(materialWellCounts([card], [medium]).get(medium)).toBe(1);
  });
});
