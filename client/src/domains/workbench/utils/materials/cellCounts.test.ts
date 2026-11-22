import { countText, solveCounts, workedCountsByKey } from './cellCounts';

const worked = (values: Record<string, string>) =>
  Object.fromEntries([...workedCountsByKey(values)].map(([key, count]) => [key, count.text]));

describe('solveCounts', () => {
  it('works out live, total or viability from the other two', () => {
    expect(worked({ 'total-cell-conc': '2e6', viability: '90' })).toMatchObject({
      'live-cell-conc': '1.80E+6',
    });
    expect(worked({ 'live-cell-conc': '1.8e6', viability: '90' })).toMatchObject({
      'total-cell-conc': '2.00E+6',
    });
    expect(worked({ 'live-cell-conc': '1.8e6', 'total-cell-conc': '2e6' })).toMatchObject({
      viability: '90',
    });
  });

  it('carries a concentration through the volume to cells, and back', () => {
    expect(worked({ 'total-cell-conc': '2e6', viability: '90', volume: '5' })).toEqual({
      'live-cell-conc': '1.80E+6',
      'live-cells': '9.00E+6',
      'total-cells': '1.00E+7',
    });
    expect(worked({ 'live-cells': '1.6e6', volume: '2' })).toEqual({
      'live-cell-conc': '8.00E+5',
    });
    expect(worked({ 'total-cells': '1e7', viability: '90' })).toEqual({ 'live-cells': '9.00E+6' });
  });

  it('works nothing out from one number, and never replaces a typed one', () => {
    expect(worked({ 'total-cell-conc': '2e6' })).toEqual({});
    expect(worked({ 'total-cell-conc': '2e6', viability: '90', 'live-cell-conc': '5e5' })).toEqual(
      {}
    );
  });

  it('flags typed numbers that disagree, and gives the working of a worked-out one', () => {
    const mismatching = solveCounts({
      'total-cell-conc': '2e6',
      viability: '90',
      'live-cell-conc': '5e5',
    });
    expect(mismatching.mismatches.get('liveConcentration')).toBe(
      'Live cell conc. ≠ Total cell conc. × Viability, which gives 1.80E+6 cells/mL'
    );
    expect(
      solveCounts({ 'total-cell-conc': '2e6', viability: '90', 'live-cell-conc': '1.8e6' })
        .mismatches.size
    ).toBe(0);
    expect(
      workedCountsByKey({ 'total-cell-conc': '2e6', viability: '90' }).get('live-cell-conc')
        ?.working
    ).toBe('Total cell conc. × Viability = 2.00E+6 cells/mL × 90%');
    expect(countText('viability', 0.9)).toBe('90%');
  });
});
