import { calculateBoard } from '../formulas/boardCalculation';

import { replicateMerges } from './replicateMerges';
import { activeTabOf, sheetOf } from './vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const plateWithReplicates = (stain: Record<string, string>): VesselMapBlock =>
  ({
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    activeTab: 0,
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Compound X' }] }],
    cells: {
      'p:A1': { drug: { valueId: 'x' } },
      'p:A2': { drug: { valueId: 'x' } },
    },
    series: {},
    mergesReplicates: true,
    counts: {},
    amountNames: {},
    side: 'stain',
    stain,
  }) as unknown as VesselMapBlock;

const mergedKeys = (block: VesselMapBlock, isStainSide: boolean) => {
  const merges = replicateMerges(
    block,
    sheetOf(block, activeTabOf(block)),
    calculateBoard([]),
    isStainSide
  );
  return [...merges.anchors.values()].map(merged => merged.keys);
};

describe('replicate merges', () => {
  it('splits replicates that get different mixes on the Stain side only', () => {
    const block = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'fmo' });
    expect(mergedKeys(block, false)).toEqual([['p:A1', 'p:A2']]);
    expect(mergedKeys(block, true)).toEqual([]);
  });

  it('keeps replicates merged on the Stain side when they share a mix', () => {
    const block = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'full' });
    expect(mergedKeys(block, true)).toEqual([['p:A1', 'p:A2']]);
  });
});
