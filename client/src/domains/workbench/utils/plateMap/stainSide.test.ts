import { stainedPlaces, stainedWellCounts, plateStains, stainWells } from './stainSide';

import type { FlowCytometryPanelBlock, PlateMapBlock } from '@odysseus/shared-schemas';

const panel = (stains: FlowCytometryPanelBlock['mixes']) =>
  ({ mixes: stains }) as FlowCytometryPanelBlock;
const plate = (stain: Record<string, string>) => ({ stain }) as PlateMapBlock;

describe('plate stains', () => {
  it('colors stains with markers in turn and a stain with none grey, across panels', () => {
    const stains = plateStains([
      panel([
        { id: 'full', name: 'Full Stain', rowIds: ['cd3'], plus: [] },
        { id: 'none', name: 'Unstained', rowIds: [], plus: [] },
      ]),
      panel([
        { id: 'fmo', name: ' ', rowIds: [], plus: [{ id: 'p', materialId: 'm', stain: '' }] },
      ]),
    ]);
    expect(stains.map(stain => stain.name)).toEqual(['Full Stain', 'Unstained', 'Unnamed stain']);
    expect(stains[1].color).toBe('#7d8494');
    expect(new Set(stains.map(stain => stain.color)).size).toBe(3);
  });

  it('keeps a color picked for a stain, the others keeping their turn in the palette', () => {
    const stains = plateStains([
      panel([
        { id: 'full', name: 'Full Stain', color: '#d97a7a', rowIds: ['cd3'], plus: [] },
        { id: 'fmo', name: 'FMO', rowIds: ['cd4'], plus: [] },
      ]),
    ]);
    expect(stains.map(stain => stain.color)).toEqual(['#d97a7a', '#5cc8bd']);
  });
});

describe('stained wells', () => {
  it('counts each stain across every plate', () => {
    const counts = stainedWellCounts([
      plate({ 'p:A1': 'full', 'p:A2': 'full' }),
      plate({ 'q:B1': 'full', 'q:B2': 'fmo' }),
    ]);
    expect([...counts]).toEqual([
      ['full', 3],
      ['fmo', 1],
    ]);
  });

  it('lists where each stain is, by plate name, with its count', () => {
    const block = {
      id: 'map',
      plates: [
        { id: 'p', vessel: '96', name: 'P1' },
        { id: 'q', vessel: '96', name: '' },
      ],
      sets: [{ id: 's', vessel: 'facs', count: 4 }],
      stain: { 'p:A1': 'full', 'p:A2': 'full', 'q:B1': 'full', 's#0:1': 'full', 's#1:1': 'fmo' },
      stainedIn: {},
    } as unknown as PlateMapBlock;
    expect(stainedPlaces([block]).get('full')).toEqual([
      { blockId: 'map', name: 'P1', count: 2 },
      { blockId: 'map', name: 'Plate 2', count: 1 },
      { blockId: 'map', name: 'Tubes', count: 1 },
    ]);
    expect(stainedPlaces([block]).get('fmo')).toEqual([
      { blockId: 'map', name: 'Tubes', count: 1 },
    ]);
  });

  it('puts a stain on wells, or clears them', () => {
    const block = plate({ 'p:A1': 'fmo' });
    stainWells(block, ['p:A1', 'p:A2'], 'full');
    expect(block.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full' });
    stainWells(block, ['p:A1'], undefined);
    expect(block.stain).toEqual({ 'p:A2': 'full' });
  });
});
