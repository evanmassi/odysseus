import { calculateBoard } from '../formulas/boardCalculation';

import { activeTabOf, sheetOf } from './plateMapTabs';
import { replicatesShownAsOne } from './replicatesShownAsOne';
import { stainSamples } from './stainLayout';

import type { ShownPlateMap } from './shownPlateMap';

const plateWithReplicates = (
  stain: Record<string, string>,
  stainedIn: Record<string, string> = {}
): ShownPlateMap =>
  ({
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
    activeTab: 0,
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Compound X' }] }],
    samples: {
      'p:A1': { drug: { valueId: 'x' } },
      'p:A2': { drug: { valueId: 'x' } },
    },
    showsReplicatesAsOne: true,
    counts: {},
    amountNames: {},
    side: 'stain',
    stain,
    stainedIn,
  }) as unknown as ShownPlateMap;

const mergedKeys = (plateMap: ShownPlateMap, isStainSide: boolean) => {
  const sheet = sheetOf(plateMap, activeTabOf(plateMap));
  const shownAsOne = replicatesShownAsOne(
    plateMap,
    {},
    sheet,
    calculateBoard([]),
    isStainSide ? stainSamples(plateMap, sheet) : undefined
  );
  return [...shownAsOne.anchors.values()].map(replicateGroup => replicateGroup.keys);
};

describe('replicates shown as one', () => {
  it('splits replicates that get different stains on the Stain side only', () => {
    const plateMap = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'fmo' });
    expect(mergedKeys(plateMap, false)).toEqual([['p:A1', 'p:A2']]);
    expect(mergedKeys(plateMap, true)).toEqual([]);
  });

  it('keeps replicates shown as one on the Stain side when they share a stain', () => {
    const plateMap = plateWithReplicates({ 'p:A1': 'full', 'p:A2': 'full' });
    expect(mergedKeys(plateMap, true)).toEqual([['p:A1', 'p:A2']]);
  });

  it('never groups a well that was moved or pooled on the Stain side', () => {
    const plateMap = plateWithReplicates({ 'p:A2': 'full', 'p:A3': 'full' }, { 'p:A1': 'p:A3' });
    expect(mergedKeys(plateMap, false)).toEqual([['p:A1', 'p:A2']]);
    expect(mergedKeys(plateMap, true)).toEqual([]);
  });
});
