import { stainedPlaces, stainedWellCounts, plateStains, stainWells } from './stainSide';

import type { FlowCytometryPanelCard, PlateMapCard } from '@odysseus/shared-schemas';

const panel = (stains: FlowCytometryPanelCard['stains']) =>
  ({ stains: stains }) as FlowCytometryPanelCard;
const plate = (stain: Record<string, string>) => ({ stain }) as PlateMapCard;

describe('plate stains', () => {
  it('colors stains with markers in turn and a stain with none grey, across panels', () => {
    const stains = plateStains([
      panel([
        { id: 'full', name: 'Full Stain', markerIds: ['cd3'], plus: [] },
        { id: 'none', name: 'Unstained', markerIds: [], plus: [] },
      ]),
      panel([
        { id: 'fmo', name: ' ', markerIds: [], plus: [{ id: 'p', materialId: 'm', staining: '' }] },
      ]),
    ]);
    expect(stains.map(stain => stain.name)).toEqual(['Full Stain', 'Unstained', 'Unnamed stain']);
    expect(stains[1].color).toBe('#7d8494');
    expect(new Set(stains.map(stain => stain.color)).size).toBe(3);
  });

  it('keeps a color picked for a stain, the others keeping their turn in the palette', () => {
    const stains = plateStains([
      panel([
        { id: 'full', name: 'Full Stain', color: '#d97a7a', markerIds: ['cd3'], plus: [] },
        { id: 'fmo', name: 'FMO', markerIds: ['cd4'], plus: [] },
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
    const card = {
      id: 'map',
      plates: [
        { id: 'p', labware: '96', name: 'P1' },
        { id: 'q', labware: '96', name: '' },
      ],
      otherLabware: [{ id: 's', labware: 'facs', count: 4 }],
      stain: { 'p:A1': 'full', 'p:A2': 'full', 'q:B1': 'full', 's#0:1': 'full', 's#1:1': 'fmo' },
      stainedIn: {},
    } as unknown as PlateMapCard;
    expect(stainedPlaces([card]).get('full')).toEqual([
      { cardId: 'map', name: 'P1', count: 2 },
      { cardId: 'map', name: 'Plate 2', count: 1 },
      { cardId: 'map', name: 'Tubes', count: 1 },
    ]);
    expect(stainedPlaces([card]).get('fmo')).toEqual([{ cardId: 'map', name: 'Tubes', count: 1 }]);
  });

  it('puts a stain on wells, or clears them', () => {
    const card = plate({ 'p:A1': 'fmo' });
    stainWells(card, ['p:A1', 'p:A2'], 'full');
    expect(card.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full' });
    stainWells(card, ['p:A1'], undefined);
    expect(card.stain).toEqual({ 'p:A2': 'full' });
  });
});
