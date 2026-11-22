import { calculateBoard } from '../formulas/boardCalculation';

import { activeTabOf, sheetOf } from './plateMapTabs';
import { replicatesShownAsOne } from './replicatesShownAsOne';
import { stainSamples } from './stainLayout';

import type { PlateMapBlock } from '@odysseus/shared-schemas';

const plateWithReplicates = (
  stain: Record<string, string>,
  stainedIn: Record<string, string> = {}
): PlateMapBlock =>
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
    stainedIn,
  }) as unknown as PlateMapBlock;

const mergedKeys = (block: PlateMapBlock, isStainSide: boolean) => {
  const sheet = sheetOf(block, activeTabOf(block));
  const shownAsOne = replicatesShownAsOne(
    block,
    sheet,
    calculateBoard([]),
    isStainSide ? stainSamples(block, sheet) : undefined
  );
  return [...shownAsOne.anchors.values()].map(replicateGroup => replicateGroup.keys);
};

describe('replicates shown as one', () => {
  it('splits replicates that get different stains on the Stain side only', () => {
    const block = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'fmo' });
    expect(mergedKeys(block, false)).toEqual([['p:A1', 'p:A2']]);
    expect(mergedKeys(block, true)).toEqual([]);
  });

  it('keeps replicates shown as one on the Stain side when they share a stain', () => {
    const block = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'full' });
    expect(mergedKeys(block, true)).toEqual([['p:A1', 'p:A2']]);
  });

  it('never groups a well that was moved or pooled on the Stain side', () => {
    const block = plateWithReplicates({ 'p:A2': 'full', 'p:A3': 'full' }, { 'p:A1': 'p:A3' });
    expect(mergedKeys(block, false)).toEqual([['p:A1', 'p:A2']]);
    expect(mergedKeys(block, true)).toEqual([]);
  });
});
