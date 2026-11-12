import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import {
  dilutionFactor,
  firstOpenDetector,
  panelDetectorLabels,
  panelLayout,
  stainCandidates,
  stainSteps,
} from './cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from './instrumentCatalog';

import type { CytometerBlock, MaterialItem } from '@odysseus/shared-schemas';

const material = (type: string, name: string, values: Record<string, string> = {}) => {
  const item = materialFromGuess(
    { group: 'ab', type, name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  Object.assign(item.values, values);
  return item;
};

const [IQUE, A8] = BUILT_IN_INSTRUMENTS;

const panel = (
  rows: Array<[MaterialItem, string, string?]>,
  instrument = IQUE
): CytometerBlock => ({
  id: 'panel',
  type: 'cytometer',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  instrument,
  rows: rows.map(([item, detectorId, stain = 'Surface'], index) => ({
    id: `row${index}`,
    materialId: item.id,
    detectorId,
    stain,
    dilution: '200',
  })),
});

const cd4 = material('Antibody', 'CD4 BV421', {
  target: 'CD4',
  conjugate: 'BV421',
  clone: 'RPA-T4',
});
const cd8 = material('Antibody', 'CD8 Pacific Blue', { target: 'CD8', conjugate: 'Pacific Blue' });
const zombie = material('Dye', 'Zombie NIR', { target: 'Live/Dead' });
const fcBlock = material('Fc block', 'Human TruStain FcX');

describe('panelLayout', () => {
  it('puts every detector of the instrument under its laser, with its stains', () => {
    const layout = panelLayout(panel([[cd4, 'VL1']]), [cd4]);
    expect(layout.lasers.map(laser => laser.name)).toEqual(['Violet', 'Blue', 'Red']);
    expect(layout.lasers[0].slots).toHaveLength(6);
    const [stain] = layout.lasers[0].slots[0].stains;
    expect(stain).toMatchObject({ marker: 'CD4', fluorochrome: 'BV421', clone: 'RPA-T4' });
    expect(layout.clashCount).toBe(0);
  });

  it('flags two stains in one detector, naming the other one on each', () => {
    const layout = panelLayout(
      panel([
        [cd4, 'VL1'],
        [cd8, 'VL1'],
      ]),
      [cd4, cd8]
    );
    const [first, second] = layout.lasers[0].slots[0].stains;
    expect(layout.clashCount).toBe(1);
    expect(first.sharesDetectorWith).toEqual(['Pacific Blue']);
    expect(second.sharesDetectorWith).toEqual(['BV421']);
  });

  it('reads a dye with no conjugate field by its own name', () => {
    const [stain] = panelLayout(panel([[zombie, 'R5']], A8), [zombie]).lasers[4].slots[4].stains;
    expect(stain).toMatchObject({ marker: 'Live/Dead', fluorochrome: 'Zombie NIR' });
    expect(stain.isFluorochromeEditable).toBe(false);
  });

  it('keeps stains whose detector the instrument lacks, to be placed again', () => {
    const layout = panelLayout(panel([[cd4, 'VL1']], A8), [cd4]);
    expect(layout.unplaced.map(stain => stain.marker)).toEqual(['CD4']);
  });
});

describe('the A8 description', () => {
  it('has the 78 spectral detectors of the UV-V-B-YG-R setup on one band grid', () => {
    expect(A8.lasers.map(laser => laser.detectors.length)).toEqual([22, 20, 16, 12, 8]);
    expect(A8.lasers.map(laser => laser.detectors[0].filter)).toEqual([
      '375/20',
      '420/20',
      '501/16',
      '574/16',
      '655/20',
    ]);
    expect(A8.lasers[4].detectors.at(-1)).toMatchObject({ id: 'R8', filter: '844/34' });
  });
});

describe('stainCandidates', () => {
  it('offers stains from Materials not yet on the panel, leaving out Fc block and beads', () => {
    const offered = stainCandidates(panel([[cd4, 'VL1']]), [cd4, cd8, zombie, fcBlock]);
    expect(offered.map(item => item.name)).toEqual(['CD8 Pacific Blue', 'Zombie NIR']);
  });
});

describe('stainSteps', () => {
  it('lists the steps in use first, then the starting ones, once each ignoring case', () => {
    const block = panel([
      [cd4, 'VL1', 'Tetramer'],
      [cd8, 'VL2', 'surface'],
    ]);
    expect(stainSteps(block)).toEqual(['Tetramer', 'surface', 'Viability', 'ICS']);
  });
});

describe('dilutionFactor', () => {
  it('keeps N whether typed as 1:N or N', () => {
    expect(dilutionFactor('1:200')).toBe('200');
    expect(dilutionFactor(' 1 : 50')).toBe('50');
    expect(dilutionFactor('2000')).toBe('2000');
  });
});

describe('firstOpenDetector', () => {
  it('picks the laser’s first free detector', () => {
    const red = panelLayout(panel([[cd4, 'R1']], A8), [cd4]).lasers[4];
    expect(firstOpenDetector(red)).toBe('R2');
  });
});

describe('panelDetectorLabels', () => {
  it('names each material’s detectors across panel cards', () => {
    const uses = panelDetectorLabels({
      blocks: [
        panel([
          [cd4, 'VL1'],
          [cd8, 'VL2'],
        ]),
        panel([[cd4, 'VL4']]),
      ],
    });
    expect(uses.get(cd4.id)).toBe('VL1, VL4');
  });
});
