import { plateAmounts, vesselCounts } from './vesselMapNames';

import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

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
