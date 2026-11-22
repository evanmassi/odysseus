import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import { valueNeeds } from './valueNeeds';

import type { Protocol, ValuesCard } from '@odysseus/shared-schemas';

const item = (id: string, name: string, group: string, recipe: unknown[] = []) => ({
  id,
  group,
  type: 'Other',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe,
});

function needsFor(items: ValuesCard['items']) {
  const values = { id: 'values', type: 'values', rows: [], items } as unknown as ValuesCard;
  const protocol = {
    cards: [
      {
        id: 'materials',
        type: 'materials',
        items: [
          item('mix', 'Stain mix', 'ab', [
            { id: 'r1', materialId: 'cd3', amount: '2', unit: 'µL' },
          ]),
          item('cd3', 'CD3', 'ab'),
        ],
      },
      values,
    ],
  } as unknown as Protocol;
  return valueNeeds(protocol, values, calculateBoard(collectBoardNames(protocol)));
}

describe('valueNeeds', () => {
  it('asks for what a recipe is missing on the row it belongs to', () => {
    const [need] = needsFor([]);
    expect(need).toMatchObject({
      kind: 'absent',
      routed: { destination: { kind: 'row', materialId: 'mix', label: 'Vol./well' } },
    });
  });

  it('asks for the well volume under Whole experiment once the mix has its volume', () => {
    const needs = needsFor([
      { id: 'v', name: 'Stain mix volume per well', value: '50', unit: 'µL' },
    ]);
    expect(needs).toEqual([
      expect.objectContaining({
        kind: 'absent',
        routed: expect.objectContaining({ destination: { kind: 'general' } }),
        neededFor: ['Final conc. for Stain mix'],
      }),
    ]);
  });

  it('points at a blank value by its id', () => {
    const needs = needsFor([
      { id: 'v', name: 'Stain mix volume per well', value: '50', unit: 'µL' },
      { id: 'well', name: 'Well volume', value: '', unit: 'µL' },
    ]);
    expect(needs).toEqual([expect.objectContaining({ kind: 'blank', id: 'well' })]);
  });
});
