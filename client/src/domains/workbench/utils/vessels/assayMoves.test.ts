import { moveAssayWells } from './assayMoves';
import { activeTabOf, sheetOf } from './vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const filled = { drug: { valueId: 'x' } };

const plate = (wells: string[], stain: Record<string, string>, stainedIn = {}) =>
  ({
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    activeTab: 0,
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Compound X' }] }],
    cells: Object.fromEntries(wells.map(label => [`p:${label}`, structuredClone(filled)])),
    series: {},
    stain,
    stainedIn,
  }) as unknown as VesselMapBlock;

const keys = (...labels: string[]) => new Set(labels.map(label => `p:${label}`));
const move = (block: VesselMapBlock, from: string[], to: string[]) =>
  moveAssayWells(
    block,
    sheetOf(block, activeTabOf(block)),
    keys(...from),
    to.map(label => `p:${label}`)
  );

describe('moving assay wells', () => {
  it('carries the stain of a well that sits on its own spot, even when shifting onto itself', () => {
    const block = plate(['A1', 'A2'], { 'p:A1': 'full', 'p:A2': 'fmo' });
    move(block, ['A1', 'A2'], ['A2', 'A3']);
    expect(Object.keys(block.cells).sort()).toEqual(['p:A2', 'p:A3']);
    expect(block.stain).toEqual({ 'p:A2': 'full', 'p:A3': 'fmo' });
    expect(block.stainedIn).toEqual({});
  });

  it('keeps a pooled well where it sits on the Stain side', () => {
    const block = plate(['A1', 'A2'], { 'p:A1': 'full' }, { 'p:A2': 'p:A1' });
    move(block, ['A2'], ['C5']);
    expect(block.stainedIn).toEqual({ 'p:C5': 'p:A1' });
    expect(block.stain).toEqual({ 'p:A1': 'full' });
  });

  it('replaces what was in the landing wells, stain and all', () => {
    const block = plate(['A1', 'B1'], { 'p:B1': 'fmo' });
    move(block, ['A1'], ['B1']);
    expect(Object.keys(block.cells)).toEqual(['p:B1']);
    expect(block.stain).toEqual({});
  });
});
