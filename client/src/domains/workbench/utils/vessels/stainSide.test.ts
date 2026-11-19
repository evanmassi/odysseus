import { stainedWellCounts, stainMixes, stainWells } from './stainSide';

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

  it('puts a mix on wells, or clears them', () => {
    const block = plate({ 'p:A1': 'fmo' });
    stainWells(block, ['p:A1', 'p:A2'], 'full');
    expect(block.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full' });
    stainWells(block, ['p:A1'], undefined);
    expect(block.stain).toEqual({ 'p:A2': 'full' });
  });
});
