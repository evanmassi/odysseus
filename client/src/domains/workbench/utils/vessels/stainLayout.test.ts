import { calculateBoard } from '../formulas/boardCalculation';

import {
  canPoolReplicates,
  canPoolSamples,
  canUnpool,
  forgetStainOf,
  moveStainSpots,
  poolReplicates,
  poolSamples,
  stainMoveTargets,
  stainOccupants,
  unpool,
} from './stainLayout';
import { activeTabOf, sheetOf } from './vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const calculation = calculateBoard([]);
const DOSES = ['100 nM', '10 nM'];
const DONORS = ['Donor 1', 'Donor 2'];

function assayPlate(stain: Record<string, string> = {}): VesselMapBlock {
  const cells: VesselMapBlock['cells'] = {};
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
  } as unknown as VesselMapBlock;
}

const sheetFor = (block: VesselMapBlock) => sheetOf(block, activeTabOf(block));
const keys = (...labels: string[]) => new Set(labels.map(label => `p:${label}`));
const occupantsAt = (block: VesselMapBlock, label: string) =>
  stainOccupants(block, sheetFor(block)).get(`p:${label}`);

describe('stain layout', () => {
  it('seats every assay well on its own spot until something moves', () => {
    const block = assayPlate();
    expect(occupantsAt(block, 'A1')).toEqual(['p:A1']);
    expect(occupantsAt(block, 'C1')).toEqual([]);
  });

  it('pools the selected wells into the first selected spot, keeping the first mix', () => {
    const block = assayPlate({ 'p:A2': 'full', 'p:A3': 'fmo' });
    const sheet = sheetFor(block);
    expect(canPoolSamples(sheet, stainOccupants(block, sheet), keys('A1', 'A2', 'A3'))).toBe(true);
    expect(poolSamples(block, sheet, keys('A1', 'A2', 'A3'))).toEqual(['p:A1']);
    expect(occupantsAt(block, 'A1')).toEqual(['p:A1', 'p:A2', 'p:A3']);
    expect(occupantsAt(block, 'A2')).toEqual([]);
    expect(block.stain).toEqual({ 'p:A1': 'full' });
  });

  it('pools each set of replicates on its own, side by side in their row', () => {
    const block = assayPlate();
    const sheet = sheetFor(block);
    const whole = keys('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6');
    expect(canPoolReplicates(block, sheet, stainOccupants(block, sheet), whole, calculation)).toBe(
      true
    );
    expect(poolReplicates(block, sheet, whole, calculation)).toEqual([
      'p:A1',
      'p:A2',
      'p:B1',
      'p:B2',
    ]);
    expect(occupantsAt(block, 'A2')).toEqual(['p:A4', 'p:A5', 'p:A6']);
    expect(occupantsAt(block, 'B1')).toEqual(['p:B1', 'p:B2', 'p:B3']);
    expect(occupantsAt(block, 'A3')).toEqual([]);
  });

  it('offers Pool replicates only when the selection holds more than one set', () => {
    const block = assayPlate();
    const sheet = sheetFor(block);
    const occupants = stainOccupants(block, sheet);
    expect(canPoolReplicates(block, sheet, occupants, keys('A1', 'A2', 'A3'), calculation)).toBe(
      false
    );
  });

  it('unpools back to their own wells, carrying the mix, and moves anything sitting there', () => {
    const block = assayPlate({ 'p:A1': 'full' });
    const sheet = sheetFor(block);
    poolSamples(block, sheet, keys('A1', 'A2', 'A3'));
    moveStainSpots(block, sheet, keys('B1'), ['p:A2']);
    expect(canUnpool(stainOccupants(block, sheet), keys('A1'))).toBe(true);
    unpool(block, sheet, keys('A1'));
    expect(block.stainedIn).toEqual({});
    expect(block.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full', 'p:A3': 'full' });
  });

  it('moves cut wells with their mix, and refuses spots that hold other cells or fall off', () => {
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
    if ('landing' in targets) moveStainSpots(block, sheet, keys('A5', 'A6'), targets.landing);
    expect(occupantsAt(block, 'A5')).toEqual([]);
    expect(occupantsAt(block, 'A6')).toEqual(['p:A5']);
    expect(occupantsAt(block, 'A7')).toEqual(['p:A6']);
    expect(block.stain).toEqual({ 'p:A6': 'full' });
  });

  it('clearing an assay well takes its stain only once nothing else sits in its spot', () => {
    const block = assayPlate({ 'p:A1': 'full', 'p:B1': 'fmo' });
    poolSamples(block, sheetFor(block), keys('A1', 'A2'));
    forgetStainOf(block, keys('A2'));
    expect(block.stain['p:A1']).toBe('full');
    forgetStainOf(block, keys('B1'));
    expect(block.stain['p:B1']).toBeUndefined();
  });
});
