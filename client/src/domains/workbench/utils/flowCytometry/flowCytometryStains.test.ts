import { BUILT_IN_CATALOG } from '../fluors/fluorCatalog';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import { BUILT_IN_CYTOMETERS } from './cytometerCatalog';
import { panelLayout } from './flowCytometryPanel';
import {
  emptyStain,
  fmoStain,
  fullStain,
  markerColumns,
  singleStains,
  unstainedControl,
} from './flowCytometryStains';

import type { FlowCytometryPanelCard } from '@odysseus/shared-schemas';

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

const card: FlowCytometryPanelCard = {
  id: 'panel',
  type: 'flowCytometryPanel',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  cytometer: BUILT_IN_CYTOMETERS[0],
  markers: [
    { id: 'foxp3', materialId: foxp3.id, detectorId: 'BL2', staining: 'ICS' },
    { id: 'cd3', materialId: cd3.id, detectorId: 'BL1', staining: 'Surface' },
    { id: 'cd4', materialId: cd4.id, detectorId: 'VL1', staining: 'Surface' },
  ],
  stains: [],
};

const columns = markerColumns(panelLayout(card, [cd4, cd3, foxp3], BUILT_IN_CATALOG));

describe('markerColumns', () => {
  it('lists the panel’s placed markers in laser and detector order', () => {
    expect(columns.map(column => column.label)).toEqual(['CD4 BV421', 'CD3 FITC', 'Foxp3 PE']);
  });
});

describe('stain shortcuts', () => {
  it('ticks every marker for the full stain and none for unstained or an empty stain', () => {
    expect(fullStain(columns)).toMatchObject({
      name: 'Full stain',
      markerIds: ['cd4', 'cd3', 'foxp3'],
    });
    expect(unstainedControl()).toMatchObject({ name: 'Unstained', markerIds: [] });
    expect(emptyStain()).toMatchObject({ name: 'New stain', markerIds: [], plus: [] });
  });

  it('makes one single stain per antibody', () => {
    expect(singleStains(columns).map(stain => [stain.name, stain.markerIds])).toEqual([
      ['Single CD4 BV421', ['cd4']],
      ['Single CD3 FITC', ['cd3']],
      ['Single Foxp3 PE', ['foxp3']],
    ]);
  });

  it('leaves out the picked marker for an FMO', () => {
    expect(fmoStain(columns, 'cd3')).toMatchObject({
      name: 'FMO CD3',
      markerIds: ['cd4', 'foxp3'],
    });
    expect(fmoStain(columns, 'gone')).toBeUndefined();
  });
});
