import { produce } from 'immer';

import { linkPlateNames } from '../materials/renameFollowing';

import { materialWellCounts, plateAmounts, plateMapCounts } from './plateMapNames';

import type { MaterialItem, PlateLine, PlateMap, Protocol } from '@odysseus/shared-schemas';

const plateMap = (content: Partial<PlateMap>): PlateMap => ({
  id: 'map',
  title: '',
  plates: [{ id: 'p1', labware: '96', name: '' }],
  otherLabware: [],
  lines: [],
  samples: {},
  counts: {},
  amountNames: {},
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
      otherLabware: [{ id: 's1', labware: 'T75', count: 2 }],
      lines: [line('drug', ['Aspirin', 'Brufen'])],
      samples: {
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
      samples: {
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
});

describe('material well counts', () => {
  const wellCountOf = (card: PlateMap, material: MaterialItem) => {
    const unlinked = { materials: { items: [material], customGroups: [] }, plateMaps: [card] };
    const protocol = produce(unlinked as unknown as Protocol, linkPlateNames);
    const [linked] = protocol.materials.items;
    return materialWellCounts(protocol.plateMaps, [linked]).get(linked);
  };

  it('count wells by the short name in front of a note in parentheses', () => {
    const card = plateMap({
      lines: [line('stim', ['STX', 'None'])],
      samples: {
        'p1:A1': { stim: { valueId: 'STX' } },
        'p1:A2': { stim: { valueId: 'STX' } },
        'p1:A3': { stim: { valueId: 'None' } },
      },
    });
    const stimMaterial = {
      id: 'stim',
      name: 'STX (stim X description)',
      shownFields: [],
      values: {},
      isSetAside: false,
    } as unknown as MaterialItem;
    expect(wellCountOf(card, stimMaterial)).toBe(2);
  });

  it('count wells by the material short name', () => {
    const card = plateMap({
      lines: [line('media', ['ImmunoCult XF'])],
      samples: { 'p1:A1': { media: { valueId: 'ImmunoCult XF' } } },
    });
    const medium = {
      id: 'medium',
      name: 'ImmunoCult™-XF T Cell Expansion Medium',
      shownFields: ['short-name'],
      values: { 'short-name': 'ImmunoCult XF' },
      isSetAside: false,
    } as unknown as MaterialItem;
    expect(wellCountOf(card, medium)).toBe(1);
  });
});
