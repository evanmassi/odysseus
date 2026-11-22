import { calculateBoard } from '../formulas/boardCalculation';

import { readsSeriesAlike, pointAmount } from './plateSeries';

const empty = calculateBoard([]);
const points = (series: Parameters<typeof pointAmount>[0], board = empty) =>
  [0, 1, 2].map(step => pointAmount(series, step, board));

describe('series points', () => {
  it('divide a dose by the dilution factor at each point', () => {
    expect(points({ top: '300', unit: 'nM', dilutionFactor: '3', direction: 'right' })).toEqual([
      { amount: '300', unit: 'nM' },
      { amount: '100', unit: 'nM' },
      { amount: '33.3', unit: 'nM' },
    ]);
  });

  it('dilute a 1:N top further at each point', () => {
    expect(
      points({ top: '1:10', unit: '1:N', dilutionFactor: '3', direction: 'right' }).map(
        point => point.amount
      )
    ).toEqual(['10', '30', '90']);
  });

  it('read a start and fold given as board names', () => {
    const board = calculateBoard([
      { kind: 'value', id: 'top', name: 'Top dose', value: '10', unit: 'µM' },
      { kind: 'value', id: 'fold', name: 'Fold', value: '2', unit: 'X' },
    ]);
    expect(
      points({ top: 'Top dose', unit: 'µM', dilutionFactor: 'fold', direction: 'down' }, board)
    ).toEqual([
      { amount: '10 µM', unit: '' },
      { amount: '5 µM', unit: '' },
      { amount: '2.5 µM', unit: '' },
    ]);
  });

  it('list typed points as they are', () => {
    expect(points({ typedValues: ['High', 'Low'], direction: 'right' })).toEqual([
      { amount: 'High', unit: '' },
      { amount: 'Low', unit: '' },
      { amount: '', unit: '' },
    ]);
  });

  it('keep the start when there is no usable fold', () => {
    expect(
      pointAmount({ top: '5', unit: 'nM', dilutionFactor: '', direction: 'right' }, 2, empty)
    ).toEqual({ amount: '5', unit: 'nM' });
  });
});

describe('a plate map reading the board', () => {
  const board = (topDose: string, other: string) =>
    calculateBoard([
      { kind: 'value', id: 'top', name: 'Top dose', value: topDose, unit: 'µM' },
      { kind: 'value', id: 'other', name: 'Other volume', value: other, unit: 'µL' },
    ]);
  const series = [
    { top: 'Top dose', unit: 'µM', dilutionFactor: '3', direction: 'right' as const },
  ];

  it('ignores board changes its series do not read', () => {
    expect(readsSeriesAlike(series, board('10', '50'), board('10', '80'))).toBe(true);
  });

  it('notices when a name its series reads changes', () => {
    expect(readsSeriesAlike(series, board('10', '50'), board('20', '50'))).toBe(false);
  });
});
