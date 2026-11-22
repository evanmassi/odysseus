import { BUILT_IN_CATALOG } from '../fluors/fluorCatalog';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import { BUILT_IN_CYTOMETERS } from './cytometerCatalog';
import {
  dilutionFactor,
  firstOpenDetector,
  newMarkerMaterial,
  panelDetectorLabels,
  panelLayout,
  markerCandidates,
  panelStainings,
} from './flowCytometryPanel';

import type { FlowCytometryPanelCard, MaterialItem } from '@odysseus/shared-schemas';

const material = (type: string, name: string, values: Record<string, string> = {}) => {
  const item = materialFromGuess(
    { group: 'ab', type, name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  Object.assign(item.values, values);
  return item;
};

const [IQUE, A8] = BUILT_IN_CYTOMETERS;
const NOTHING_KNOWN = { kinds: new Map(), fluors: [] };

const panel = (
  rows: Array<[MaterialItem, string, string?]>,
  cytometer = IQUE
): FlowCytometryPanelCard => ({
  id: 'panel',
  type: 'cytometer',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  instrument: cytometer,
  rows: rows.map(([item, detectorId, stain = 'Surface'], index) => ({
    id: `row${index}`,
    materialId: item.id,
    detectorId,
    stain,
    dilution: '200',
  })),
  mixes: [],
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
  it('puts every detector of the cytometer under its laser, with its markers', () => {
    const layout = panelLayout(panel([[cd4, 'VL1']]), [cd4], BUILT_IN_CATALOG);
    expect(layout.lasers.map(laser => laser.name)).toEqual(['Violet', 'Blue', 'Red']);
    expect(layout.lasers[0].slots).toHaveLength(6);
    const [marker] = layout.lasers[0].slots[0].markers;
    expect(marker).toMatchObject({ markerName: 'CD4', fluor: 'BV421', clone: 'RPA-T4' });
    expect(layout.detectorConflictCount).toBe(0);
  });

  it('flags two markers in one detector, naming the other one on each', () => {
    const layout = panelLayout(
      panel([
        [cd4, 'VL1'],
        [cd8, 'VL1'],
      ]),
      [cd4, cd8],
      BUILT_IN_CATALOG
    );
    const [first, second] = layout.lasers[0].slots[0].markers;
    expect(layout.detectorConflictCount).toBe(1);
    expect(first.sharesDetectorWith).toEqual(['Pacific Blue']);
    expect(second.sharesDetectorWith).toEqual(['BV421']);
  });

  it('reads a dye with no conjugate field by its own name', () => {
    const [marker] = panelLayout(panel([[zombie, 'R5']], A8), [zombie], BUILT_IN_CATALOG).lasers[4]
      .slots[4].markers;
    expect(marker).toMatchObject({ markerName: 'Live/Dead', fluor: 'Zombie NIR' });
    expect(marker.isFluorEditable).toBe(false);
  });

  it('keeps markers whose detector the cytometer lacks, to be placed again', () => {
    const layout = panelLayout(panel([[cd4, 'VL1']], A8), [cd4], BUILT_IN_CATALOG);
    expect(layout.unplaced.map(marker => marker.markerName)).toEqual(['CD4']);
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

describe('markerCandidates', () => {
  it('offers markers from Materials not yet on the panel, leaving out Fc block and beads', () => {
    const offered = markerCandidates(panel([[cd4, 'VL1']]), [cd4, cd8, zombie, fcBlock]);
    expect(offered.map(item => item.name)).toEqual(['CD8 Pacific Blue', 'Zombie NIR']);
  });

  it('leaves out antibodies with no fluor, like a therapeutic drug or a purified vial', () => {
    const drug = material('Antibody', 'Pembrolizumab');
    const purified = material('Antibody', 'CD3 purified OKT3', { target: 'CD3', clone: 'OKT3' });
    const offered = markerCandidates(panel([]), [drug, purified, cd8]);
    expect(offered.map(item => item.name)).toEqual(['CD8 Pacific Blue']);
  });
});

describe('panelStainings', () => {
  it('lists the stainings in use first, then the starting ones, once each ignoring case', () => {
    const card = panel([
      [cd4, 'VL1', 'Tetramer'],
      [cd8, 'VL2', 'surface'],
    ]);
    expect(panelStainings(card)).toEqual(['Tetramer', 'surface', 'Viability', 'ICS']);
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
    const red = panelLayout(panel([[cd4, 'R1']], A8), [cd4], BUILT_IN_CATALOG).lasers[4];
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
    expect(uses.get(cd4.id)).toBe('Detectors: VL1, VL4');
  });
});

describe('newMarkerMaterial', () => {
  it('reads a typed marker the way Materials does', () => {
    const item = newMarkerMaterial('IFN-gamma APC 4S.B3', NOTHING_KNOWN, EMPTY_LAB_MEMORY);
    expect(item).toMatchObject({ group: 'ab', type: 'Antibody', name: 'IFN-γ APC 4S.B3' });
    expect(item.values).toMatchObject({ conjugate: 'APC', clone: '4S.B3' });
    expect(newMarkerMaterial('Zombie NIR', NOTHING_KNOWN, EMPTY_LAB_MEMORY).type).toBe('Dye');
  });

  it('files anything it cannot place as an antibody', () => {
    expect(newMarkerMaterial('Mystery reagent 7', NOTHING_KNOWN, EMPTY_LAB_MEMORY)).toMatchObject({
      group: 'ab',
      type: 'Antibody',
    });
  });
});
