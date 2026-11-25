import { moveAssayWells } from './assayMoves';
import { activeTabOf, sheetOf } from './plateMapTabs';

import type { ShownPlateMap } from './shownPlateMap';

const filled = { drug: { valueId: 'x' } };

const plate = (wells: string[], stain: Record<string, string>, stainedIn = {}) =>
  ({
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
    activeTab: 0,
    lines: [{ id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Compound X' }] }],
    samples: Object.fromEntries(wells.map(label => [`p:${label}`, structuredClone(filled)])),
    series: {},
    stain,
    stainedIn,
  }) as unknown as ShownPlateMap;

const keys = (...labels: string[]) => new Set(labels.map(label => `p:${label}`));
const move = (plateMap: ShownPlateMap, from: string[], to: string[]) =>
  moveAssayWells(
    plateMap,
    sheetOf(plateMap, activeTabOf(plateMap)),
    keys(...from),
    to.map(label => `p:${label}`)
  );

describe('moving assay wells', () => {
  it('carries the stain of a well that sits on its own position, even when shifting onto itself', () => {
    const plateMap = plate(['A1', 'A2'], { 'p:A1': 'full', 'p:A2': 'fmo' });
    move(plateMap, ['A1', 'A2'], ['A2', 'A3']);
    expect(Object.keys(plateMap.samples).sort()).toEqual(['p:A2', 'p:A3']);
    expect(plateMap.stain).toEqual({ 'p:A2': 'full', 'p:A3': 'fmo' });
    expect(plateMap.stainedIn).toEqual({});
  });

  it('keeps a pooled well where it sits on the Stain side', () => {
    const plateMap = plate(['A1', 'A2'], { 'p:A1': 'full' }, { 'p:A2': 'p:A1' });
    move(plateMap, ['A2'], ['C5']);
    expect(plateMap.stainedIn).toEqual({ 'p:C5': 'p:A1' });
    expect(plateMap.stain).toEqual({ 'p:A1': 'full' });
  });

  it('replaces what was in the landing wells, stain and all', () => {
    const plateMap = plate(['A1', 'B1'], { 'p:B1': 'fmo' });
    move(plateMap, ['A1'], ['B1']);
    expect(Object.keys(plateMap.samples)).toEqual(['p:B1']);
    expect(plateMap.stain).toEqual({});
  });
});
