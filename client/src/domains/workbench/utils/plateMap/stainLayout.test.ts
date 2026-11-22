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

import type { PlateMapCard } from '@odysseus/shared-schemas';

const board = calculateBoard([]);
const DOSES = ['100 nM', '10 nM'];
const DONORS = ['Donor 1', 'Donor 2'];

function assayPlate(stain: Record<string, string> = {}): PlateMapCard {
  const cells: PlateMapCard['samples'] = {};
  DONORS.forEach((_, row) => {
    for (let col = 0; col < 6; col++) {
      cells[`p:${'AB'[row]}${col + 1}`] = {
        dose: { valueId: `dose${Math.floor(col / 3)}` },
        donor: { valueId: `donor${row}` },
      };
    }
  });
  return {
    plates: [{ id: 'p', labware: '96', name: '' }],
    otherLabware: [],
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
    samples: cells,
    series: {},
    showsReplicatesAsOne: true,
    counts: {},
    amountNames: {},
    side: 'stain',
    stain,
    stainedIn: {},
  } as unknown as PlateMapCard;
}

const sheetFor = (card: PlateMapCard) => sheetOf(card, activeTabOf(card));
const keys = (...labels: string[]) => new Set(labels.map(label => `p:${label}`));
const samplesAt = (card: PlateMapCard, label: string) =>
  stainSamples(card, sheetFor(card)).get(`p:${label}`);

describe('stain layout', () => {
  it('seats every assay well on its own position until something moves', () => {
    const card = assayPlate();
    expect(samplesAt(card, 'A1')).toEqual(['p:A1']);
    expect(samplesAt(card, 'C1')).toEqual([]);
  });

  it('pools the selected wells into the first selected position, keeping the first stain', () => {
    const card = assayPlate({ 'p:A2': 'full', 'p:A3': 'fmo' });
    const sheet = sheetFor(card);
    expect(canPoolSamples(sheet, stainSamples(card, sheet), keys('A1', 'A2', 'A3'))).toBe(true);
    expect(poolSamples(card, sheet, keys('A1', 'A2', 'A3'))).toEqual(['p:A1']);
    expect(samplesAt(card, 'A1')).toEqual(['p:A1', 'p:A2', 'p:A3']);
    expect(samplesAt(card, 'A2')).toEqual([]);
    expect(card.stain).toEqual({ 'p:A1': 'full' });
  });

  it('pools each set of replicates on its own, side by side in their row', () => {
    const card = assayPlate();
    const sheet = sheetFor(card);
    const whole = keys('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6');
    expect(canPoolReplicates(card, sheet, stainSamples(card, sheet), whole, board)).toBe(true);
    expect(poolReplicates(card, sheet, whole, board)).toEqual(['p:A1', 'p:A2', 'p:B1', 'p:B2']);
    expect(samplesAt(card, 'A2')).toEqual(['p:A4', 'p:A5', 'p:A6']);
    expect(samplesAt(card, 'B1')).toEqual(['p:B1', 'p:B2', 'p:B3']);
    expect(samplesAt(card, 'A3')).toEqual([]);
  });

  it('offers Pool replicates only when the selection holds more than one set', () => {
    const card = assayPlate();
    const sheet = sheetFor(card);
    const samples = stainSamples(card, sheet);
    expect(canPoolReplicates(card, sheet, samples, keys('A1', 'A2', 'A3'), board)).toBe(false);
  });

  it('unpools back to their own wells, carrying the stain, and moves anything sitting there', () => {
    const card = assayPlate({ 'p:A1': 'full' });
    const sheet = sheetFor(card);
    poolSamples(card, sheet, keys('A1', 'A2', 'A3'));
    moveStainPositions(card, sheet, keys('B1'), ['p:A2']);
    expect(canUnpool(stainSamples(card, sheet), keys('A1'))).toBe(true);
    unpool(card, sheet, keys('A1'));
    expect(card.stainedIn).toEqual({});
    expect(card.stain).toEqual({ 'p:A1': 'full', 'p:A2': 'full', 'p:A3': 'full' });
  });

  it('moves cut wells with their stain, and refuses positions that hold other samples or fall off', () => {
    const card = assayPlate({ 'p:A5': 'full' });
    const sheet = sheetFor(card);
    expect(stainMoveTargets(card, sheet, keys('A5', 'A6'), keys('B1'))).toEqual({
      blockedBy: 'cells',
    });
    expect(stainMoveTargets(card, sheet, keys('A5', 'A6'), keys('H12'))).toEqual({
      blockedBy: 'edge',
    });
    const targets = stainMoveTargets(card, sheet, keys('A5', 'A6'), keys('A6'));
    expect(targets).toEqual({ landing: ['p:A6', 'p:A7'] });
    if ('landing' in targets) moveStainPositions(card, sheet, keys('A5', 'A6'), targets.landing);
    expect(samplesAt(card, 'A5')).toEqual([]);
    expect(samplesAt(card, 'A6')).toEqual(['p:A5']);
    expect(samplesAt(card, 'A7')).toEqual(['p:A6']);
    expect(card.stain).toEqual({ 'p:A6': 'full' });
  });

  it('clearing an assay well takes its stain only once nothing else sits in its position', () => {
    const card = assayPlate({ 'p:A1': 'full', 'p:B1': 'fmo' });
    poolSamples(card, sheetFor(card), keys('A1', 'A2'));
    forgetStainOf(card, keys('A2'));
    expect(card.stain['p:A1']).toBe('full');
    forgetStainOf(card, keys('B1'));
    expect(card.stain['p:B1']).toBeUndefined();
  });
});
