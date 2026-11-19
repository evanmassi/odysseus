import { stainedPlaces, stainedWellCounts, stainMixes, stainWells } from './stainSide';

import type { CytometerBlock, VesselMapBlock } from '@odysseus/shared-schemas';

const panel = (mixes: CytometerBlock['mixes']) => ({ mixes }) as CytometerBlock;
const plate = (stain: Record<string, string>) => ({ stain }) as VesselMapBlock;

describe('stain mixes', () => {
  it('colors mixes with stains in turn and a mix with none grey, across panels', () => {
    const mixes = stainMixes([
      panel([
        { id: 'full', name: 'Full Stain', rowIds: ['cd3'], plus: [] },
        { id: 'none', name: 'Unstained', rowIds: [], plus: [] },
      ]),
      panel([
        { id: 'fmo', name: ' ', rowIds: [], plus: [{ id: 'p', materialId: 'm', stain: '' }] },
      ]),
    ]);
    expect(mixes.map(mix => mix.name)).toEqual(['Full Stain', 'Unstained', 'Unnamed mix']);
    expect(mixes[1].color).toBe('#7d8494');
    expect(new Set(mixes.map(mix => mix.color)).size).toBe(3);
  });

  it('keeps a color picked for a mix, the others keeping their turn in the palette', () => {
    const mixes = stainMixes([
      panel([
        { id: 'full', name: 'Full Stain', color: '#d97a7a', rowIds: ['cd3'], plus: [] },
        { id: 'fmo', name: 'FMO', rowIds: ['cd4'], plus: [] },
      ]),
    ]);
    expect(mixes.map(mix => mix.color)).toEqual(['#d97a7a', '#5cc8bd']);
  });
});

describe('stained wells', () => {
  it('counts each mix across every plate', () => {
    const counts = stainedWellCounts([
      plate({ 'p:A1': 'full', 'p:A2': 'full' }),
      plate({ 'q:B1': 'full', 'q:B2': 'fmo' }),
    ]);
    expect([...counts]).toEqual([
      ['full', 3],
      ['fmo', 1],
    ]);
  });

  it('lists where each mix is, by plate name, with its count', () => {
    const block = {
      id: 'map',
      plates: [
        { id: 'p', vessel: '96', name: 'P1' },
        { id: 'q', vessel: '96', name: '' },
      ],
      sets: [{ id: 's', vessel: 'facs', count: 4 }],
      stain: { 'p:A1': 'full', 'p:A2': 'full', 'q:B1': 'full', 's#0:1': 'full', 's#1:1': 'fmo' },
    } as unknown as VesselMapBlock;
    expect(stainedPlaces([block]).get('full')).toEqual([
      { blockId: 'map', name: 'P1', count: 2 },
      { blockId: 'map', name: 'Plate 2', count: 1 },
      { blockId: 'map', name: 'Group 1', count: 1 },
    ]);
    expect(stainedPlaces([block]).get('fmo')).toEqual([
      { blockId: 'map', name: 'Group 1', count: 1 },
    ]);
  });

  it('puts a mix on wells, or clears them', () => {
    const block = plate({ 'p:A1': 'fmo' });
    stainWells(block, ['p:A1', 'p:A2'], 'full');
    expect(block.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full' });
    stainWells(block, ['p:A1'], undefined);
    expect(block.stain).toEqual({ 'p:A2': 'full' });
  });
});
