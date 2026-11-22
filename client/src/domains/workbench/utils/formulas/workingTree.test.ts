import { calculateBoard, type BoardName } from './boardCalculation';
import { workingFraction, workingRefs, workingText } from './workingTree';

const value = (name: string, amount: string, unit: string): BoardName => ({
  kind: 'value',
  id: name,
  name,
  value: amount,
  unit,
});

const workingOf = (expr: string) => {
  const board = calculateBoard([
    value('Volume made', '8', 'mL'),
    value('Stock', '8000', '×'),
    value('Working', '4', '×'),
    { kind: 'calculation', id: 'f', name: 'Needed', formula: expr, unit: '' },
  ]);
  const result = board.results.get('f');
  if (result?.status !== 'ok') throw new Error('expected an answer');
  return result.working;
};

const names = (nodes: ReturnType<typeof workingRefs>) => nodes.map(node => node.name);

describe('working tree', () => {
  it('gathers a run of × and ÷ into one fraction, multiplied names on top', () => {
    const fraction = workingFraction(workingOf('Volume made / Stock * Working'));
    expect(fraction?.over.map(node => (node.kind === 'ref' ? node.name : ''))).toEqual([
      'Volume made',
      'Working',
    ]);
    expect(fraction?.under.map(node => (node.kind === 'ref' ? node.name : ''))).toEqual(['Stock']);
  });

  it('flips a divided group, so a ÷ (b ÷ c) puts c on top', () => {
    const fraction = workingFraction(workingOf('Volume made / (Stock / Working)'));
    expect(fraction?.over).toHaveLength(2);
    expect(fraction?.under).toHaveLength(1);
  });

  it('lists the names it read and spells the working out as text', () => {
    const working = workingOf('Volume made / Stock * Working');
    expect(names(workingRefs(working))).toEqual(['Volume made', 'Stock', 'Working']);
    expect(workingText(working)).toBe('8 mL ÷ 8000 × × 4 ×');
  });
});
