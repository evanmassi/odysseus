import { removalMessage, removeCard, shownPlate, linkedPlateMapsOf } from './linkedPlateMaps';

import type { LinkedPlateMapCard, Protocol, PlateMapCard } from '@odysseus/shared-schemas';

const placed = { x: 0, y: 0, w: 6, h: 10, isCollapsed: false };

const original = (): PlateMapCard =>
  ({
    ...placed,
    id: 'map',
    type: 'plate',
    title: 'Plate map',
    page: 'plates',
    plates: [{ id: 'p', vessel: '96', name: 'P1' }],
    sets: [],
    activeTab: 0,
    lines: [],
    cells: { 'p:A1': {} },
    series: {},
    mergesReplicates: true,
    counts: {},
    amountNames: {},
    side: 'assay',
    stain: { 'p:A1': 'full' },
    stainedIn: {},
  }) as PlateMapCard;

const view = (id: string, page: string): LinkedPlateMapCard => ({
  ...placed,
  id,
  type: 'plateView',
  title: 'Plate map',
  page,
  y: 20,
  shows: 'map',
  side: 'stain',
  activeTab: 0,
  mergesReplicates: false,
});

const protocolWith = (...cards: Protocol['blocks']): Protocol =>
  ({
    pages: [
      { id: 'plates', name: 'Plates & Calculations', steps: [] },
      { id: 'takedown', name: 'Takedown', steps: [] },
    ],
    blocks: cards,
  }) as unknown as Protocol;

describe('plate views', () => {
  it('finds the views of a plate card and shows its plates with their own side and merging', () => {
    const takedown = view('v1', 'takedown');
    const protocol = protocolWith(original(), takedown);
    expect(linkedPlateMapsOf(protocol.blocks, 'map').map(found => found.id)).toEqual(['v1']);
    const shown = shownPlate(original(), takedown);
    expect(shown).toMatchObject({ id: 'map', side: 'stain', mergesReplicates: false });
    expect(shown.stain).toEqual({ 'p:A1': 'full' });
  });

  it('removing a view leaves the plates where they live', () => {
    const protocol = protocolWith(original(), view('v1', 'takedown'));
    removeCard(protocol, 'v1');
    expect(protocol.blocks.map(card => card.id)).toEqual(['map']);
  });

  it('removing the original moves its plates into the first view, keeping their ids', () => {
    const protocol = protocolWith(original(), view('v1', 'takedown'), view('v2', 'plates'));
    removeCard(protocol, 'map');
    expect(protocol.blocks.map(card => card.id)).toEqual(['map', 'v2']);
    expect(protocol.blocks[0]).toMatchObject({
      type: 'plate',
      page: 'takedown',
      y: 20,
      side: 'stain',
      mergesReplicates: false,
      stain: { 'p:A1': 'full' },
      stainedIn: {},
    });
    expect(linkedPlateMapsOf(protocol.blocks, 'map').map(found => found.id)).toEqual(['v2']);
  });

  it('says what removing will do', () => {
    const protocol = protocolWith(original(), view('v1', 'takedown'));
    expect(removalMessage(protocol, protocol.blocks[1])).toBe(
      'Remove this card? Its plates stay on Plates & Calculations.'
    );
    expect(removalMessage(protocol, protocol.blocks[0])).toBe(
      'Remove the "Plate map" card from this page? Its plates move to the card on Takedown, so nothing is lost.'
    );
  });
});
