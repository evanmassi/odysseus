import { produce } from 'immer';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { materialsById } from './valueEdits';
import { fillBlanks, fillTargets } from './valueFill';
import { buildValueTable } from './valueTable';

import type { Protocol } from '@odysseus/shared-schemas';

const sampleEntry = (id: string, name: string) => ({
  id,
  group: 'bio',
  type: 'Cell line',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe: [],
});

const protocol = {
  cards: [
    { id: 'materials', type: 'materials' },
    { id: 'values', type: 'values' },
  ],
  materials: {
    items: [
      sampleEntry('raji', 'Raji'),
      sampleEntry('jurkat', 'Jurkat'),
      sampleEntry('k562', 'K562'),
    ],
    customGroups: [],
  },
  values: {
    rows: [
      { id: 'sec-raji', materialId: 'raji' },
      { id: 'sec-jurkat', materialId: 'jurkat' },
      { id: 'sec-k562', materialId: 'k562' },
    ],
    items: [
      { id: 'raji-per', row: 'sec-raji', name: 'Per well', value: '1e4', unit: 'cells' },
      { id: 'jurkat-per', row: 'sec-jurkat', name: 'Per well', value: '', unit: '' },
      { id: 'k562-vol', row: 'sec-k562', name: 'Volume per well', value: '50', unit: 'µL' },
    ],
  },
  calculations: { items: [], materialSections: [] },
} as unknown as Protocol;

function bioGroup(current: Protocol) {
  const [group] = buildValueTable(current, {
    materials: materialsById(current),
    board: calculateBoard(collectBoardNames(current)),
    needs: [],
    unsortedNames: [],
  });
  return group;
}

const perWell = (current: Protocol) =>
  current.values.items
    .filter(item => 'name' in item && item.name === 'Per well')
    .map(item => ('value' in item ? [item.row, item.value, item.unit] : []));

describe('filling blanks in a column', () => {
  it('reaches blank values and rows missing the value, never filled ones', () => {
    const targets = fillTargets(bioGroup(protocol), 'per well');
    expect(targets.map(target => target.kind)).toEqual(['cell', 'slot']);
  });

  it('fills every blank with one value and unit in a single change, leaving filled ones alone', () => {
    const group = bioGroup(protocol);
    const filled = produce(protocol, draft =>
      fillBlanks(draft, fillTargets(group, 'per well'), '2e4', 'cells')
    );
    expect(perWell(filled)).toEqual([
      ['sec-raji', '1e4', 'cells'],
      ['sec-jurkat', '2e4', 'cells'],
      ['sec-k562', '2e4', 'cells'],
    ]);
    expect(fillTargets(bioGroup(filled), 'per well')).toEqual([]);
  });
});
