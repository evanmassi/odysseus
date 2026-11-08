import { parseValueLine } from './valueLines';

describe('parseValueLine', () => {
  it.each([
    ['Incubation 24 h', { name: 'Incubation', value: '24', unit: 'h' }],
    ['Volume per well 100 µL', { name: 'Volume per well', value: '100', unit: 'µL' }],
    ['Volume per well 100uL', { name: 'Volume per well', value: '100', unit: 'µL' }],
    ['Spin 300 xg', { name: 'Spin', value: '300', unit: '× g' }],
    ['Fold 3x', { name: 'Fold', value: '3', unit: 'X' }],
    ['Cells per well 5e4', { name: 'Cells per well', value: '5e4', unit: '' }],
    ['Ab dilution 1:200', { name: 'Ab dilution', value: '200', unit: '1:N' }],
    ['E:T ratio = 10:1', { name: 'E:T ratio', value: '10:1', unit: 'N:N' }],
    ['Wash buffer mL', { name: 'Wash buffer', value: '', unit: 'mL' }],
    ['Replicates', { name: 'Replicates', value: '', unit: '' }],
  ])('reads %s', (line, expected) => {
    expect(parseValueLine(line)).toEqual(expected);
  });

  it('ignores a blank line', () => {
    expect(parseValueLine('   ')).toBeUndefined();
  });
});
