import { calculateBoard } from '../formulas/boardCalculation';

import { blankOptions } from './stepPresets';

const calculation = calculateBoard([
  { kind: 'value', id: 'v1', name: 'Spin time', value: '5', unit: 'min' },
  { kind: 'value', id: 'v2', name: 'Wash volume', value: '300', unit: 'µL' },
  {
    kind: 'item',
    id: 'i1',
    name: 'PBS',
    groupTitle: 'Media, buffers, & solutions',
    hint: '',
    label: 'Buffer',
  },
]);

const texts = (label: string, typed: string) =>
  blankOptions(calculation, label, typed).map(option => option.text);

describe('blankOptions', () => {
  it('offers common choices and board values in the blank’s units when nothing is typed', () => {
    expect(texts('time', 'time')).toEqual([
      '5 min',
      '10 min',
      '30 min',
      '1 h',
      'overnight',
      'Spin time',
    ]);
  });

  it('turns a typed number into one option per unit', () => {
    expect(texts('volume', '250')).toEqual(['250 µL', '250 mL']);
  });

  it('filters by what was typed', () => {
    expect(texts('temperature', 'ice')).toEqual(['on ice']);
  });

  it('offers board materials for blanks it has no choices for', () => {
    expect(blankOptions(calculation, 'buffer', 'buffer')).toEqual([{ text: 'PBS', name: 'PBS' }]);
  });
});
