import { countText, solveCounts, workedCountsByKey } from './cellCounts';

const worked = (values: Record<string, string>) =>
  Object.fromEntries([...workedCountsByKey(values)].map(([key, count]) => [key, count.text]));

describe('solveCounts', () => {
  it('works out live, total or viability from the other two', () => {
    expect(worked({ count: '2e6', viability: '90' })).toMatchObject({
      'live-cell-conc': '1.80E+6',
    });
    expect(worked({ 'live-cell-conc': '1.8e6', viability: '90' })).toMatchObject({
      count: '2.00E+6',
    });
    expect(worked({ 'live-cell-conc': '1.8e6', count: '2e6' })).toMatchObject({ viability: '90' });
  });

  it('carries a concentration through the volume to cells, and back', () => {
    expect(worked({ count: '2e6', viability: '90', volume: '5' })).toEqual({
      'live-cell-conc': '1.80E+6',
      'live-count': '9.00E+6',
      'total-count': '1.00E+7',
    });
    expect(worked({ 'live-count': '1.6e6', volume: '2' })).toEqual({
      'live-cell-conc': '8.00E+5',
    });
    expect(worked({ 'total-count': '1e7', viability: '90' })).toEqual({ 'live-count': '9.00E+6' });
  });

  it('works nothing out from one number, and never replaces a typed one', () => {
    expect(worked({ count: '2e6' })).toEqual({});
    expect(worked({ count: '2e6', viability: '90', 'live-cell-conc': '5e5' })).toEqual({});
  });

  it('flags typed numbers that disagree, and gives the working of a worked-out one', () => {
    const clashing = solveCounts({ count: '2e6', viability: '90', 'live-cell-conc': '5e5' });
    expect(clashing.clashes.get('liveConcentration')).toBe(
      'Live cell conc. ≠ Total cell conc. × Viability, which gives 1.80E+6 cells/mL'
    );
    expect(
      solveCounts({ count: '2e6', viability: '90', 'live-cell-conc': '1.8e6' }).clashes.size
    ).toBe(0);
    expect(
      workedCountsByKey({ count: '2e6', viability: '90' }).get('live-cell-conc')?.working
    ).toBe('Total cell conc. × Viability = 2.00E+6 cells/mL × 90%');
    expect(countText('viability', 0.9)).toBe('90%');
  });
});
