import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import {
  emptyMix,
  fmoMix,
  fullStainMix,
  mixColumns,
  singleStainMixes,
  unstainedMix,
} from './cytometerMixes';
import { panelLayout } from './cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from './instrumentCatalog';

import type { CytometerBlock } from '@odysseus/shared-schemas';

const antibody = (name: string, target: string, conjugate: string) => {
  const item = materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  Object.assign(item.values, { target, conjugate });
  return item;
};

const cd4 = antibody('CD4 BV421', 'CD4', 'BV421');
const cd3 = antibody('CD3 FITC', 'CD3', 'FITC');
const foxp3 = antibody('Foxp3 PE', 'Foxp3', 'PE');

const block: CytometerBlock = {
  id: 'panel',
  type: 'cytometer',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  instrument: BUILT_IN_INSTRUMENTS[0],
  rows: [
    { id: 'foxp3', materialId: foxp3.id, detectorId: 'BL2', stain: 'ICS', dilution: '50' },
    { id: 'cd3', materialId: cd3.id, detectorId: 'BL1', stain: 'Surface', dilution: '100' },
    { id: 'cd4', materialId: cd4.id, detectorId: 'VL1', stain: 'Surface', dilution: '200' },
  ],
  mixes: [],
};

const columns = mixColumns(panelLayout(block, [cd4, cd3, foxp3]));

describe('mixColumns', () => {
  it('lists the panel’s placed stains in laser and detector order', () => {
    expect(columns.map(column => column.label)).toEqual(['CD4 BV421', 'CD3 FITC', 'Foxp3 PE']);
  });
});

describe('mix shortcuts', () => {
  it('ticks every stain for the full stain and none for unstained or an empty mix', () => {
    expect(fullStainMix(columns)).toMatchObject({
      name: 'Full stain',
      rowIds: ['cd4', 'cd3', 'foxp3'],
    });
    expect(unstainedMix()).toMatchObject({ name: 'Unstained', rowIds: [] });
    expect(emptyMix()).toMatchObject({ name: 'New mix', rowIds: [], plus: [] });
  });

  it('makes one single stain per antibody', () => {
    expect(singleStainMixes(columns).map(mix => [mix.name, mix.rowIds])).toEqual([
      ['Single CD4 BV421', ['cd4']],
      ['Single CD3 FITC', ['cd3']],
      ['Single Foxp3 PE', ['foxp3']],
    ]);
  });

  it('leaves out the picked marker for an FMO', () => {
    expect(fmoMix(columns, 'cd3')).toMatchObject({ name: 'FMO CD3', rowIds: ['cd4', 'foxp3'] });
    expect(fmoMix(columns, 'gone')).toBeUndefined();
  });
});
