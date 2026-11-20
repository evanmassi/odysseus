import { produce } from 'immer';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { materialsById } from './valueEdits';
import { fillBlanks, fillTargets } from './valueFill';
import { buildValueTable } from './valueTable';

import type { Protocol, ValuesBlock } from '@odysseus/shared-schemas';

const cellLine = (id: string, name: string) => ({
  id,
  group: 'bio',
  type: 'Cell line',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isDropped: false,
  recipe: [],
});

const protocol = {
  blocks: [
    {
      id: 'materials',
      type: 'materials',
      items: [cellLine('raji', 'Raji'), cellLine('jurkat', 'Jurkat'), cellLine('k562', 'K562')],
    },
    {
      id: 'values',
      type: 'values',
      sections: [
        { id: 'sec-raji', materialId: 'raji' },
        { id: 'sec-jurkat', materialId: 'jurkat' },
        { id: 'sec-k562', materialId: 'k562' },
      ],
      items: [
        { id: 'raji-per', section: 'sec-raji', name: 'Per well', value: '1e4', unit: 'cells' },
        { id: 'jurkat-per', section: 'sec-jurkat', name: 'Per well', value: '', unit: '' },
        { id: 'k562-vol', section: 'sec-k562', name: 'Volume per well', value: '50', unit: 'µL' },
      ],
    },
  ],
} as unknown as Protocol;

const valuesOf = (current: Protocol) =>
  current.blocks.find((block): block is ValuesBlock => block.type === 'values')!;

function bioGroup(current: Protocol) {
  const [group] = buildValueTable(current, valuesOf(current), {
    materials: materialsById(current),
    calculation: calculateBoard(collectBoardNames(current)),
    needs: [],
    unsortedNames: [],
  });
  return group;
}

const perWell = (current: Protocol) =>
  valuesOf(current)
    .items.filter(item => 'name' in item && item.name === 'Per well')
    .map(item => ('value' in item ? [item.section, item.value, item.unit] : []));

describe('filling blanks in a column', () => {
  it('reaches blank values and rows missing the value, never filled ones', () => {
    const targets = fillTargets(bioGroup(protocol), 'per well');
    expect(targets.map(target => target.kind)).toEqual(['cell', 'slot']);
  });

  it('fills every blank with one value and unit in a single change, leaving filled ones alone', () => {
    const group = bioGroup(protocol);
    const filled = produce(protocol, draft =>
      fillBlanks(draft, 'values', fillTargets(group, 'per well'), '2e4', 'cells')
    );
    expect(perWell(filled)).toEqual([
      ['sec-raji', '1e4', 'cells'],
      ['sec-jurkat', '2e4', 'cells'],
      ['sec-k562', '2e4', 'cells'],
    ]);
    expect(fillTargets(bioGroup(filled), 'per well')).toEqual([]);
  });
});
