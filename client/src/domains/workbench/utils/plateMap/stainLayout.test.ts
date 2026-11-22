import { calculateBoard } from '../formulas/boardCalculation';

import { activeTabOf, sheetOf } from './plateMapTabs';
import {
  canPoolReplicates,
  canPoolSamples,
  canUnpool,
  forgetStainOf,
  moveStainPositions,
  poolReplicates,
  poolSamples,
  stainMoveTargets,
  stainSamples,
  unpool,
} from './stainLayout';

import type { PlateMapBlock } from '@odysseus/shared-schemas';

const board = calculateBoard([]);
const DOSES = ['100 nM', '10 nM'];
const DONORS = ['Donor 1', 'Donor 2'];

function assayPlate(stain: Record<string, string> = {}): PlateMapBlock {
  const cells: PlateMapBlock['cells'] = {};
  DONORS.forEach((_, row) => {
    for (let col = 0; col < 6; col++) {
      cells[`p:${'AB'[row]}${col + 1}`] = {
        dose: { valueId: `dose${Math.floor(col / 3)}` },
        donor: { valueId: `donor${row}` },
      };
    }
  });
  return {
    plates: [{ id: 'p', vessel: '96', name: '' }],
    sets: [],
    activeTab: 0,
    lines: [
      {
        id: 'dose',
        name: '',
        role: 'auto',
        values: DOSES.map((text, index) => ({ id: `dose${index}`, text })),
      },
      {
        id: 'donor',
        name: '',
        role: 'auto',
        values: DONORS.map((text, index) => ({ id: `donor${index}`, text })),
      },
    ],
    cells,
    series: {},
    mergesReplicates: true,
    counts: {},
    amountNames: {},
    side: 'stain',
    stain,
    stainedIn: {},
  } as unknown as PlateMapBlock;
}

const sheetFor = (block: PlateMapBlock) => sheetOf(block, activeTabOf(block));
const keys = (...labels: string[]) => new Set(labels.map(label => `p:${label}`));
const samplesAt = (block: PlateMapBlock, label: string) =>
  stainSamples(block, sheetFor(block)).get(`p:${label}`);

describe('stain layout', () => {
  it('seats every assay well on its own position until something moves', () => {
    const block = assayPlate();
    expect(samplesAt(block, 'A1')).toEqual(['p:A1']);
    expect(samplesAt(block, 'C1')).toEqual([]);
  });

  it('pools the selected wells into the first selected position, keeping the first stain', () => {
    const block = assayPlate({ 'p:A2': 'full', 'p:A3': 'fmo' });
    const sheet = sheetFor(block);
    expect(canPoolSamples(sheet, stainSamples(block, sheet), keys('A1', 'A2', 'A3'))).toBe(true);
    expect(poolSamples(block, sheet, keys('A1', 'A2', 'A3'))).toEqual(['p:A1']);
    expect(samplesAt(block, 'A1')).toEqual(['p:A1', 'p:A2', 'p:A3']);
    expect(samplesAt(block, 'A2')).toEqual([]);
    expect(block.stain).toEqual({ 'p:A1': 'full' });
  });

  it('pools each set of replicates on its own, side by side in their row', () => {
    const block = assayPlate();
    const sheet = sheetFor(block);
    const whole = keys('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6');
    expect(canPoolReplicates(block, sheet, stainSamples(block, sheet), whole, board)).toBe(true);
    expect(poolReplicates(block, sheet, whole, board)).toEqual(['p:A1', 'p:A2', 'p:B1', 'p:B2']);
    expect(samplesAt(block, 'A2')).toEqual(['p:A4', 'p:A5', 'p:A6']);
    expect(samplesAt(block, 'B1')).toEqual(['p:B1', 'p:B2', 'p:B3']);
    expect(samplesAt(block, 'A3')).toEqual([]);
  });

  it('offers Pool replicates only when the selection holds more than one set', () => {
    const block = assayPlate();
    const sheet = sheetFor(block);
    const samples = stainSamples(block, sheet);
    expect(canPoolReplicates(block, sheet, samples, keys('A1', 'A2', 'A3'), board)).toBe(false);
  });

  it('unpools back to their own wells, carrying the stain, and moves anything sitting there', () => {
    const block = assayPlate({ 'p:A1': 'full' });
    const sheet = sheetFor(block);
    poolSamples(block, sheet, keys('A1', 'A2', 'A3'));
    moveStainPositions(block, sheet, keys('B1'), ['p:A2']);
    expect(canUnpool(stainSamples(block, sheet), keys('A1'))).toBe(true);
    unpool(block, sheet, keys('A1'));
    expect(block.stainedIn).toEqual({});
    expect(block.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full', 'p:A3': 'full' });
  });

  it('moves cut wells with their stain, and refuses positions that hold other samples or fall off', () => {
    const block = assayPlate({ 'p:A5': 'full' });
    const sheet = sheetFor(block);
    expect(stainMoveTargets(block, sheet, keys('A5', 'A6'), keys('B1'))).toEqual({
      blockedBy: 'cells',
    });
    expect(stainMoveTargets(block, sheet, keys('A5', 'A6'), keys('H12'))).toEqual({
      blockedBy: 'edge',
    });
    const targets = stainMoveTargets(block, sheet, keys('A5', 'A6'), keys('A6'));
    expect(targets).toEqual({ landing: ['p:A6', 'p:A7'] });
    if ('landing' in targets) moveStainPositions(block, sheet, keys('A5', 'A6'), targets.landing);
    expect(samplesAt(block, 'A5')).toEqual([]);
    expect(samplesAt(block, 'A6')).toEqual(['p:A5']);
    expect(samplesAt(block, 'A7')).toEqual(['p:A6']);
    expect(block.stain).toEqual({ 'p:A6': 'full' });
  });

  it('clearing an assay well takes its stain only once nothing else sits in its position', () => {
    const block = assayPlate({ 'p:A1': 'full', 'p:B1': 'fmo' });
    poolSamples(block, sheetFor(block), keys('A1', 'A2'));
    forgetStainOf(block, keys('A2'));
    expect(block.stain['p:A1']).toBe('full');
    forgetStainOf(block, keys('B1'));
    expect(block.stain['p:B1']).toBeUndefined();
  });
});
