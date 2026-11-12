import { materialWellCounts, plateAmounts, vesselCounts, wellsNamed } from './vesselMapNames';

import type { MaterialItem, PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

const vesselMap = (content: Partial<VesselMapBlock>): VesselMapBlock => ({
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
  ...content,
});

const line = (id: string, texts: string[], role: PlateLine['role'] = 'auto'): PlateLine => ({
  id,
  name: '',
  role,
  values: texts.map(text => ({ id: text, text })),
});

describe('vessel counts', () => {
  it('counts each color value across plates and shelves, with typed counts winning', () => {
    const block = vesselMap({
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
    expect(vesselCounts(block).map(({ name, count }) => [name, count])).toEqual([
      ['Aspirin wells', 2],
      ['Brufen flasks', 4],
      ['Vessels used', 3],
      ['96-well plates', 1],
      ['T75 flasks', 2],
    ]);
  });
});

describe('plate amounts', () => {
  it('splits an amount that differs by color value', () => {
    const block = vesselMap({
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
    expect(plateAmounts(block).map(({ name, value }) => [name, value])).toEqual([
      ['Anti-CD3 concentration in Aspirin', '1'],
      ['Anti-CD3 concentration in Brufen', '2'],
    ]);
  });

  const twinSeries = (colorValues: [string, string]) =>
    vesselMap({
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
    expect(names).toContain('Drug X top dose in Jurkat');
    expect(names).toContain('Drug X top dose in Raji');
  });

  it('numbers twin series that share a color value', () => {
    const names = plateAmounts(twinSeries(['Jurkat', 'Jurkat'])).map(({ name }) => name);
    expect(names).toContain('Drug X top dose 1');
    expect(names).toContain('Drug X top dose 2');
  });
});

describe('twin series on different plates', () => {
  it('are told apart by the plate they sit on', () => {
    const block = vesselMap({
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
    const names = plateAmounts(block).map(({ name }) => name);
    expect(names).toContain('Drug X top dose on Plate 1');
    expect(names).toContain('Drug X top dose on Copy');
  });
});

describe('material well counts', () => {
  it('count wells by the short name in front of a note in parentheses', () => {
    const block = vesselMap({
      lines: [line('stim', ['HCKA', 'None'])],
      cells: {
        'p1:A1': { stim: { valueId: 'HCKA' } },
        'p1:A2': { stim: { valueId: 'HCKA' } },
        'p1:A3': { stim: { valueId: 'None' } },
      },
    });
    const candida = { name: 'HCKA (heat-killed Candida albicans)' } as MaterialItem;
    expect(materialWellCounts([block], [candida]).get(candida)).toBe(2);
  });
});

describe('wells named', () => {
  it('counts wells holding a name on any line, ignoring case', () => {
    const block = vesselMap({
      lines: [line('drug', ['Aspirin']), line('stain', ['Full stain', 'FMO CD25'], 'band')],
      cells: {
        'p1:A1': { drug: { valueId: 'Aspirin' }, stain: { valueId: 'Full stain' } },
        'p1:A2': { drug: { valueId: 'Aspirin' }, stain: { valueId: 'Full stain' } },
        'p1:A3': { stain: { valueId: 'FMO CD25' } },
      },
    });
    const counts = wellsNamed([block], [' full STAIN', 'FMO CD25', 'Unstained']);
    expect([...counts]).toEqual([
      [' full STAIN', 2],
      ['FMO CD25', 1],
      ['Unstained', 0],
    ]);
  });
});
