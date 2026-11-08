import { calculateBoard } from '../formulas/boardCalculation';

import { seriesPoint } from './plateSeries';

const empty = calculateBoard([]);
const points = (series: Parameters<typeof seriesPoint>[0], calculation = empty) =>
  [0, 1, 2].map(step => seriesPoint(series, step, calculation));

describe('series points', () => {
  it('divide a dose by the fold at each step', () => {
    expect(points({ start: '300', unit: 'nM', fold: '3', direction: 'right' })).toEqual([
      { amount: '300', unit: 'nM' },
      { amount: '100', unit: 'nM' },
      { amount: '33.3', unit: 'nM' },
    ]);
  });

  it('dilute a 1:N start further at each step', () => {
    expect(
      points({ start: '1:10', unit: '1:N', fold: '3', direction: 'right' }).map(
        point => point.amount
      )
    ).toEqual(['10', '30', '90']);
  });

  it('read a start and fold given as board names', () => {
    const calculation = calculateBoard([
      { kind: 'value', id: 'top', name: 'Top dose', value: '10', unit: 'µM' },
      { kind: 'value', id: 'fold', name: 'Fold', value: '2', unit: 'X' },
    ]);
    expect(
      points({ start: 'Top dose', unit: 'µM', fold: 'fold', direction: 'down' }, calculation)
    ).toEqual([
      { amount: '10 µM', unit: '' },
      { amount: '5 µM', unit: '' },
      { amount: '2.5 µM', unit: '' },
    ]);
  });

  it('list typed points as they are', () => {
    expect(points({ points: ['High', 'Low'], direction: 'right' })).toEqual([
      { amount: 'High', unit: '' },
      { amount: 'Low', unit: '' },
      { amount: '', unit: '' },
    ]);
  });

  it('keep the start when there is no usable fold', () => {
    expect(seriesPoint({ start: '5', unit: 'nM', fold: '', direction: 'right' }, 2, empty)).toEqual(
      { amount: '5', unit: 'nM' }
    );
  });
});
